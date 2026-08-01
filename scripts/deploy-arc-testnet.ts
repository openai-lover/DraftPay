import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import {
  ARC_TESTNET,
  ARC_TESTNET_RPC_URL,
  ARC_TESTNET_USDC_ADDRESS,
  draftPayContestAbi,
  draftPayFactoryAbi,
  usdcAbi,
} from "../packages/chain/src/index";
import {
  approvedContestMetadataSchema,
  canonicalJson,
  createStructuredSpecification,
  parseUsdc,
} from "../packages/shared/src/index";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  getAddress,
  http,
  isAddress,
  keccak256,
  toBytes,
  type Address,
  type Hash,
  type TransactionReceipt,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = resolve(import.meta.dirname, "..");
const environmentPath = resolve(root, ".env.local");
if (!existsSync(environmentPath)) throw new Error("Run pnpm wallets:provision:testnet first");
loadEnvFile(environmentPath);

const privateKey = process.env.DRAFTPAY_DEPLOYER_PRIVATE_KEY;
if (!privateKey || !/^0x[a-f\d]{64}$/i.test(privateKey)) {
  throw new Error("DRAFTPAY_DEPLOYER_PRIVATE_KEY is missing or invalid");
}

const rpcUrl = process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL;
const account = privateKeyToAccount(privateKey as `0x${string}`);
const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport: http(rpcUrl) });

function setEnvironmentValue(name: string, value: string): void {
  const contents = readFileSync(environmentPath, "utf8");
  const pattern = new RegExp(`^${name}=.*$`, "m");
  const next = pattern.test(contents)
    ? contents.replace(pattern, `${name}=${value}`)
    : `${contents.trimEnd()}\n${name}=${value}\n`;
  writeFileSync(environmentPath, next, { encoding: "utf8", mode: 0o600 });
}

function positiveIntegerEnvironment(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer number of seconds`);
  }
  return parsed;
}

async function confirmed(hash: Hash): Promise<TransactionReceipt> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Arc transaction reverted: ${hash}`);
  return receipt;
}

function contestAddressFrom(receipt: TransactionReceipt): Address {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: draftPayFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ContestCreated") return decoded.args.contest;
    } catch {
      // Ignore USDC and unrelated logs.
    }
  }
  throw new Error("ContestCreated event was not found in the factory receipt");
}

const chainId = await publicClient.getChainId();
if (chainId !== ARC_TESTNET.id)
  throw new Error(`Wrong chain ${chainId}; expected ${ARC_TESTNET.id}`);

let factoryAddress: Address | null = null;
const configuredFactory = process.env.NEXT_PUBLIC_DRAFTPAY_FACTORY_ADDRESS;
if (configuredFactory && isAddress(configuredFactory)) {
  const code = await publicClient.getCode({ address: configuredFactory });
  if (code && code !== "0x") factoryAddress = getAddress(configuredFactory);
}

const deployment: Record<string, unknown> = {
  network: ARC_TESTNET.name,
  chainId,
  deployer: account.address,
  recordedAt: new Date().toISOString(),
};
const deployerBalance = await publicClient.getBalance({ address: account.address });
deployment.deployerBalanceNativeAtomic = deployerBalance.toString();

const checkOnly = process.argv.includes("--check");
if (checkOnly) {
  console.log(
    JSON.stringify(
      {
        ...deployment,
        configuredFactory: factoryAddress,
        readyToDeploy: deployerBalance > 0n,
      },
      null,
      2,
    ),
  );
}

if (!checkOnly) {
  if (deployerBalance === 0n) {
    throw new Error(`Fund deployer ${account.address} with Arc Testnet USDC before deployment`);
  }

  if (!factoryAddress) {
    const artifactPath = resolve(
      root,
      "packages/contracts/out/DraftPayContestFactory.sol/DraftPayContestFactory.json",
    );
    if (!existsSync(artifactPath)) {
      throw new Error("Factory artifact is missing. Run pnpm contracts:build with Foundry first");
    }
    const artifact = JSON.parse(readFileSync(artifactPath, "utf8")) as {
      abi: readonly unknown[];
      bytecode: { object: `0x${string}` };
    };
    const hash = await walletClient.deployContract({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      args: [ARC_TESTNET_USDC_ADDRESS],
    });
    const receipt = await confirmed(hash);
    if (!receipt.contractAddress)
      throw new Error("Factory receipt did not contain a contract address");
    factoryAddress = getAddress(receipt.contractAddress);
    const code = await publicClient.getCode({ address: factoryAddress });
    if (!code || code === "0x") throw new Error("Factory bytecode was not found after deployment");
    setEnvironmentValue("NEXT_PUBLIC_DRAFTPAY_FACTORY_ADDRESS", factoryAddress);
    deployment.factory = {
      address: factoryAddress,
      transactionHash: hash,
      blockNumber: receipt.blockNumber.toString(),
    };
  } else {
    deployment.factory = { address: factoryAddress, reused: true };
  }

  if (process.argv.includes("--contests")) {
    const evaluator = process.env.NEXT_PUBLIC_DEMO_EVALUATOR_ADDRESS;
    if (!evaluator || !isAddress(evaluator)) throw new Error("Evaluator address is not configured");
    const prizeAtomic = parseUsdc(process.env.ARC_DEMO_PRIZE_USDC ?? "5");
    const now = Math.floor(Date.now() / 1_000);
    const winnerSubmissionWindow = positiveIntegerEnvironment(
      "ARC_WINNER_SUBMISSION_WINDOW_SECONDS",
      2 * 60 * 60,
    );
    const winnerSelectionWindow = positiveIntegerEnvironment(
      "ARC_WINNER_SELECTION_WINDOW_SECONDS",
      4 * 60 * 60,
    );
    const noWinnerSubmissionWindow = positiveIntegerEnvironment(
      "ARC_NO_WINNER_SUBMISSION_WINDOW_SECONDS",
      10 * 60,
    );
    const noWinnerSelectionWindow = positiveIntegerEnvironment(
      "ARC_NO_WINNER_SELECTION_WINDOW_SECONDS",
      20 * 60,
    );
    if (winnerSelectionWindow <= winnerSubmissionWindow) {
      throw new Error("Winner selection window must be after its submission window");
    }
    if (noWinnerSelectionWindow <= noWinnerSubmissionWindow) {
      throw new Error("No-winner selection window must be after its submission window");
    }
    const definitions = [
      {
        slug: "winner",
        title: "Ledgerly launch page — winner path",
        submissionDeadlineEpochSeconds: now + winnerSubmissionWindow,
        selectionDeadlineEpochSeconds: now + winnerSelectionWindow,
      },
      {
        slug: "no-winner",
        title: "Ledgerly launch page — no-winner path",
        submissionDeadlineEpochSeconds: now + noWinnerSubmissionWindow,
        selectionDeadlineEpochSeconds: now + noWinnerSelectionWindow,
      },
    ] as const;
    const contests = [];
    const deploymentDirectory = resolve(root, ".demo", "deployments");
    await mkdir(deploymentDirectory, { recursive: true });

    for (const definition of definitions) {
      const specification = createStructuredSpecification({
        title: definition.title,
        brief:
          "Build a responsive SaaS landing page for Ledgerly with a strong hero, three-tier pricing, a primary call-to-action, and a contact form. It must work at mobile widths without horizontal overflow.",
        requiredHeadline: "Close the books without closing your weekend.",
      });
      const metadata = approvedContestMetadataSchema.parse({
        specification: { ...specification, approved: true },
        prizeAtomic: prizeAtomic.toString(),
        submissionDeadlineEpochSeconds: definition.submissionDeadlineEpochSeconds,
        selectionDeadlineEpochSeconds: definition.selectionDeadlineEpochSeconds,
      });
      const specificationHash = keccak256(toBytes(canonicalJson(metadata)));
      const createHash = await walletClient.writeContract({
        address: factoryAddress,
        abi: draftPayFactoryAbi,
        functionName: "createContest",
        args: [
          evaluator,
          prizeAtomic,
          BigInt(metadata.submissionDeadlineEpochSeconds),
          BigInt(metadata.selectionDeadlineEpochSeconds),
          specificationHash,
        ],
      });
      const createReceipt = await confirmed(createHash);
      const contest = contestAddressFrom(createReceipt);
      const approveHash = await walletClient.writeContract({
        address: ARC_TESTNET_USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "approve",
        args: [contest, prizeAtomic],
      });
      await confirmed(approveHash);
      const fundHash = await walletClient.writeContract({
        address: contest,
        abi: draftPayContestAbi,
        functionName: "fund",
      });
      const fundReceipt = await confirmed(fundHash);
      const metadataPath = resolve(deploymentDirectory, `${definition.slug}-metadata.json`);
      await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
      contests.push({
        slug: definition.slug,
        address: contest,
        metadataPath,
        createTransactionHash: createHash,
        approveTransactionHash: approveHash,
        fundTransactionHash: fundHash,
        fundedBlockNumber: fundReceipt.blockNumber.toString(),
        specificationHash,
        prizeAtomic: prizeAtomic.toString(),
        submissionDeadlineEpochSeconds: metadata.submissionDeadlineEpochSeconds,
        selectionDeadlineEpochSeconds: metadata.selectionDeadlineEpochSeconds,
      });
    }
    setEnvironmentValue("NEXT_PUBLIC_DEMO_CONTEST_ADDRESS", contests[0]!.address);
    setEnvironmentValue("AGENT_SUBMIT_CONTEST_ADDRESS", contests[0]!.address);
    setEnvironmentValue("AGENT_CONTEST_METADATA_PATH", contests[0]!.metadataPath);
    deployment.contests = contests;
  }

  const evidencePath = resolve(root, ".demo", "arc-deployment.json");
  await mkdir(resolve(root, ".demo"), { recursive: true });
  await writeFile(
    evidencePath,
    `${JSON.stringify(deployment, (_, value) => (typeof value === "bigint" ? value.toString() : value), 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify({ ...deployment, evidencePath }, null, 2));
}

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import {
  ARC_TESTNET,
  ARC_TESTNET_EXPLORER_URL,
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
  preparedArtifacts,
} from "../packages/shared/src/index";
import { storeArtifact } from "../apps/agent/src/artifact-store";
import { appendEvidence } from "../apps/agent/src/evidence-store";
import { evaluateContestOnArc } from "../apps/agent/src/evaluate-onchain";
import { DeterministicBuildAdapter } from "../apps/agent/src/model-adapter";
import { readContestOnArc } from "../apps/agent/src/read-contest";
import { runBuilderAgent } from "../apps/agent/src/runner";
import { SpendingPolicy } from "../apps/agent/src/spending-policy";
import { submitProofOnArc } from "../apps/agent/src/submit-proof";
import { verifyLandingPageInBrowser } from "../apps/agent/src/browser-verifier";
import { verifyLandingPage } from "../apps/agent/src/verification";
import { CircleGatewayX402Client } from "../apps/agent/src/x402-client";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  formatUnits,
  getAddress,
  http,
  isAddress,
  isHex,
  keccak256,
  parseEther,
  toBytes,
  type Address,
  type Hash,
  type Hex,
  type TransactionReceipt,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const root = resolve(import.meta.dirname, "..");
const environmentPath = resolve(root, ".env.local");
const runPath = resolve(root, ".demo", "final-run.json");
const publicEvidenceDirectory = resolve(root, "apps", "web", "public", "evidence");
const publicArtifactDirectory = resolve(publicEvidenceDirectory, "artifacts");
const publicWebBase = "https://draft-pay-web.vercel.app";
const publicX402Url = "https://draft-pay-x402-service.vercel.app/x402/brief-analysis";
if (!existsSync(environmentPath)) throw new Error(".env.local is required");
loadEnvFile(environmentPath);

interface PersistedCheck {
  id: string;
  passed: boolean;
  detail: string;
}

interface PersistedArtifact {
  submissionId: string;
  score: number;
  hardChecks: PersistedCheck[];
}

interface PersistedContest {
  address: Address;
  fundTransactionHash: Hash;
  submissionDeadlineEpochSeconds: number;
}

interface PersistedRun extends Record<string, unknown> {
  status: string;
  contests: { winner: PersistedContest; noWinner: PersistedContest };
  artifacts: PersistedArtifact[];
  network: string;
  chainId: number;
  factory: Address;
  recordedAt: string;
  publicX402Url: string;
  agent: unknown;
  submissions: unknown;
  evaluations?: unknown;
  settlements?: unknown;
  settledAt?: string;
}

function requiredKey(name: string): Hex {
  const value = process.env[name];
  if (!value || !isHex(value) || value.length !== 66) throw new Error(`${name} is missing`);
  return value as Hex;
}

function setEnvironmentValue(name: string, value: string): void {
  const contents = readFileSync(environmentPath, "utf8");
  const pattern = new RegExp(`^${name}=.*$`, "m");
  const next = pattern.test(contents)
    ? contents.replace(pattern, `${name}=${value}`)
    : `${contents.trimEnd()}\n${name}=${value}\n`;
  writeFileSync(environmentPath, next, { encoding: "utf8", mode: 0o600 });
  process.env[name] = value;
}

function finalistKey(name: "FINALIST_TWO_PRIVATE_KEY" | "FINALIST_THREE_PRIVATE_KEY"): Hex {
  const existing = process.env[name];
  if (existing && isHex(existing) && existing.length === 66) return existing as Hex;
  const created = generatePrivateKey();
  setEnvironmentValue(name, created);
  return created;
}

const rpcUrl = process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL;
const readRpcUrl = `${publicWebBase}/api/rpc`;
const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http(readRpcUrl) });
const deployerKey = requiredKey("DRAFTPAY_DEPLOYER_PRIVATE_KEY");
const agentKey = requiredKey("AGENT_PRIVATE_KEY");
const evaluatorKey = requiredKey("EVALUATOR_PRIVATE_KEY");
const deployer = privateKeyToAccount(deployerKey);
const agent = privateKeyToAccount(agentKey);
const evaluator = privateKeyToAccount(evaluatorKey);
const deployerWallet = createWalletClient({
  account: deployer,
  chain: ARC_TESTNET,
  transport: http(rpcUrl),
});
const evaluatorWallet = createWalletClient({
  account: evaluator,
  chain: ARC_TESTNET,
  transport: http(rpcUrl),
});

async function confirmed(hash: Hash): Promise<TransactionReceipt> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Arc transaction reverted: ${hash}`);
  return receipt;
}

function explorerTx(hash: string): string {
  return `${ARC_TESTNET_EXPLORER_URL}/tx/${hash}`;
}

function artifactUrl(contentHash: string): string {
  return `${publicWebBase}/evidence/artifacts/${contentHash.slice(2).toLowerCase()}.html`;
}

async function provisionFinalistWallet(privateKey: Hex): Promise<Address> {
  const account = privateKeyToAccount(privateKey);
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance < parseEther("0.05")) {
    await confirmed(
      await evaluatorWallet.sendTransaction({ to: account.address, value: parseEther("0.2") }),
    );
  }
  return account.address;
}

function contestAddressFrom(receipt: TransactionReceipt): Address {
  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: draftPayFactoryAbi,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "ContestCreated") return getAddress(decoded.args.contest);
    } catch {
      // Ignore unrelated logs.
    }
  }
  throw new Error("ContestCreated event was not found");
}

async function createFundedContest(input: {
  factory: Address;
  slug: "winner" | "no-winner";
  title: string;
  submissionDeadline: number;
  selectionDeadline: number;
  prizeAtomic: bigint;
}) {
  const specification = createStructuredSpecification({
    title: input.title,
    brief:
      "Build a responsive SaaS landing page for Ledgerly with a strong hero, three-tier pricing, a primary call-to-action, and a contact form. It must work at mobile widths without horizontal overflow.",
    requiredHeadline: "Close the books without closing your weekend.",
  });
  const metadata = approvedContestMetadataSchema.parse({
    specification: { ...specification, approved: true },
    prizeAtomic: input.prizeAtomic.toString(),
    submissionDeadlineEpochSeconds: input.submissionDeadline,
    selectionDeadlineEpochSeconds: input.selectionDeadline,
  });
  const specificationHash = keccak256(toBytes(canonicalJson(metadata)));
  const createHash = await deployerWallet.writeContract({
    address: input.factory,
    abi: draftPayFactoryAbi,
    functionName: "createContest",
    args: [
      evaluator.address,
      input.prizeAtomic,
      BigInt(input.submissionDeadline),
      BigInt(input.selectionDeadline),
      specificationHash,
    ],
  });
  const contest = contestAddressFrom(await confirmed(createHash));
  const approveHash = await deployerWallet.writeContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "approve",
    args: [contest, input.prizeAtomic],
  });
  await confirmed(approveHash);
  const fundHash = await deployerWallet.writeContract({
    address: contest,
    abi: draftPayContestAbi,
    functionName: "fund",
  });
  await confirmed(fundHash);
  const metadataPath = resolve(root, ".demo", "final", `${input.slug}-metadata.json`);
  await mkdir(resolve(root, ".demo", "final"), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
  return {
    slug: input.slug,
    address: contest,
    metadata,
    metadataPath,
    specificationHash,
    submissionDeadlineEpochSeconds: input.submissionDeadline,
    selectionDeadlineEpochSeconds: input.selectionDeadline,
    createTransactionHash: createHash,
    approveTransactionHash: approveHash,
    fundTransactionHash: fundHash,
  };
}

async function publishStoredArtifact(stored: { htmlPath: string; metadataPath: string }) {
  await mkdir(publicArtifactDirectory, { recursive: true });
  await copyFile(
    stored.htmlPath,
    resolve(publicArtifactDirectory, stored.htmlPath.split(/[\\/]/).at(-1)!),
  );
  await copyFile(
    stored.metadataPath,
    resolve(publicArtifactDirectory, stored.metadataPath.split(/[\\/]/).at(-1)!),
  );
}

async function submitArtifact(contestAddress: Address, contentHash: Hash, privateKey: Hex) {
  return submitProofOnArc({
    contestAddress,
    contentHash,
    metadataUri: artifactUrl(contentHash),
    privateKey,
    rpcUrl,
  });
}

async function prepare() {
  if (existsSync(runPath)) {
    throw new Error(
      ".demo/final-run.json already exists; refusing to create and fund another pair",
    );
  }
  const chainId = await publicClient.getChainId();
  if (chainId !== ARC_TESTNET.id) throw new Error(`Wrong chain ${chainId}`);
  const factoryValue = process.env.NEXT_PUBLIC_DRAFTPAY_FACTORY_ADDRESS;
  if (!factoryValue || !isAddress(factoryValue)) throw new Error("Factory address is missing");
  const factory = getAddress(factoryValue);
  const code = await publicClient.getCode({ address: factory });
  if (!code || code === "0x") throw new Error("Factory bytecode is missing");
  const prizeAtomic = parseUsdc("5");
  const partialPath = resolve(root, ".demo", "final", "partial-deployment.json");
  const clientUsdc = await publicClient.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [deployer.address],
  });
  if (!existsSync(partialPath) && clientUsdc < prizeAtomic * 2n)
    throw new Error("Client does not have 10 USDC for two contests");

  const finalistTwoKey = finalistKey("FINALIST_TWO_PRIVATE_KEY");
  const finalistThreeKey = finalistKey("FINALIST_THREE_PRIVATE_KEY");
  // Keep nonce allocation deterministic on Arc RPC; these wallets are provisioned once.
  const finalistTwo = await provisionFinalistWallet(finalistTwoKey);
  const finalistThree = await provisionFinalistWallet(finalistThreeKey);

  type ContestBundle = Awaited<ReturnType<typeof createFundedContest>>;
  let winner: ContestBundle;
  let noWinner: ContestBundle;
  let submissionDeadline: number;
  if (existsSync(partialPath)) {
    const partial = JSON.parse(await readFile(partialPath, "utf8")) as {
      contests: { winner: ContestBundle; noWinner: ContestBundle };
    };
    winner = partial.contests.winner;
    noWinner = partial.contests.noWinner;
    submissionDeadline = winner.submissionDeadlineEpochSeconds;
  } else {
    const now = Math.floor(Date.now() / 1_000);
    submissionDeadline = now + 900;
    const selectionDeadline = now + 1_800;
    winner = await createFundedContest({
      factory,
      slug: "winner",
      title: "Ledgerly launch page — verified winner path",
      submissionDeadline,
      selectionDeadline,
      prizeAtomic,
    });
    noWinner = await createFundedContest({
      factory,
      slug: "no-winner",
      title: "Ledgerly launch page — finalist no-winner path",
      submissionDeadline,
      selectionDeadline,
      prizeAtomic,
    });

    // Persist the funded pair before any external service call so a transient RPC or x402 failure
    // can never cause a second pair to be funded accidentally.
    await writeFile(
      resolve(root, ".demo", "final", "partial-deployment.json"),
      `${JSON.stringify(
        {
          network: ARC_TESTNET.name,
          chainId,
          factory,
          client: deployer.address,
          evaluator: evaluator.address,
          prizeAtomic: prizeAtomic.toString(),
          contests: { winner, noWinner },
          status: "funded",
          recordedAt: new Date().toISOString(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  }

  const contest = await readContestOnArc({
    contestAddress: winner.address,
    metadata: winner.metadata,
    rpcUrl: readRpcUrl,
  });
  const policy = new SpendingPolicy({
    maxPaymentPerRequestAtomic: 50_000n,
    maxSessionSpendAtomic: 100_000n,
    maxDailySpendAtomic: 500_000n,
    allowedOrigins: [new URL(publicX402Url).origin],
    emergencyDisabled: false,
  });
  const result = await runBuilderAgent({
    contest,
    decision: {
      nowEpochSeconds: Math.floor(Date.now() / 1_000),
      generationCostAtomic: "80000",
      verificationCostAtomic: "50000",
      qualificationProbabilityBps: 7_200,
      minimumExpectedValueAtomic: "1000000",
      minimumLeadTimeSeconds: 30,
      maxPaymentPerRequestAtomic: "50000",
      maxSessionSpendAtomic: "100000",
      spentThisSessionAtomic: "0",
      maxDailySpendAtomic: "500000",
      spentTodayAtomic: "0",
      availableTools: ["static-page-generator", "deterministic-verifier", "x402-client"],
    },
    model: new DeterministicBuildAdapter(),
    x402: new CircleGatewayX402Client(publicX402Url, policy, agentKey),
    knownContentHashes: [],
  });
  if (
    !result.artifact ||
    !result.verification?.qualified ||
    !result.analysis?.payment.paymentOccurred
  ) {
    console.log(
      JSON.stringify(
        {
          diagnostic: "agent-artifact-gate",
          decision: result.decision,
          quotedDecision: result.quotedDecision,
          payment: result.analysis?.payment ?? null,
          artifact: result.artifact
            ? { mode: result.artifact.mode, providerLabel: result.artifact.providerLabel }
            : null,
          verification: result.verification ?? null,
          abandonedAfterPaidAnalysis: result.abandonedAfterPaidAnalysis,
        },
        null,
        2,
      ),
    );
    throw new Error("Real agent did not produce a qualified paid artifact");
  }
  const primaryStored = await storeArtifact({
    contentHash: result.artifact.contentHash,
    html: result.artifact.html,
    mode: result.artifact.mode,
    providerLabel: result.artifact.providerLabel,
    checks: result.verification.checks,
    estimatedCostAtomic: (
      BigInt(result.decision.metrics.estimatedGenerationCostAtomic) +
      BigInt(result.decision.metrics.estimatedVerificationCostAtomic) +
      BigInt(result.decision.metrics.estimatedX402CostAtomic)
    ).toString(),
    toolPaymentReceiptId: result.analysis.payment.receiptId,
  });
  await publishStoredArtifact(primaryStored);
  await appendEvidence({
    kind: "agent-decision",
    mode: "real",
    payload: {
      decision: result.decision.decision,
      reasons: result.decision.reasons,
      metrics: result.decision.metrics,
      providerLabel: result.artifact.providerLabel,
    },
  });
  await appendEvidence({
    kind: "tool-payment",
    mode: "real",
    payload: { ...result.analysis.payment },
  });

  const supplemental = await Promise.all(
    ([preparedArtifacts.mina, preparedArtifacts.kite] as const).map(async (html, index) => {
      const contentHash = keccak256(toBytes(html));
      const browser = await verifyLandingPageInBrowser(html);
      const verification = verifyLandingPage({
        html,
        requiredHeadline: "Close the books without closing your weekend.",
        contentHash,
        knownContentHashes: [result.artifact!.contentHash],
        browser,
      });
      if (!verification.qualified)
        throw new Error(`Prepared finalist ${index + 2} failed verification`);
      const stored = await storeArtifact({
        contentHash,
        html,
        mode: "fixture",
        providerLabel: `Prepared finalist ${index + 2}`,
        checks: verification.checks,
        estimatedCostAtomic: "0",
        toolPaymentReceiptId: null,
      });
      await publishStoredArtifact(stored);
      return { contentHash, verification, stored };
    }),
  );
  const artifacts = [
    {
      contentHash: result.artifact.contentHash as Hash,
      verification: result.verification,
      mode: "real",
      providerLabel: result.artifact.providerLabel,
      privateKey: agentKey,
      builder: agent.address,
    },
    {
      contentHash: supplemental[0]!.contentHash,
      verification: supplemental[0]!.verification,
      mode: "fixture",
      providerLabel: "Prepared finalist 2",
      privateKey: finalistTwoKey,
      builder: finalistTwo,
    },
    {
      contentHash: supplemental[1]!.contentHash,
      verification: supplemental[1]!.verification,
      mode: "fixture",
      providerLabel: "Prepared finalist 3",
      privateKey: finalistThreeKey,
      builder: finalistThree,
    },
  ] as const;

  const submissions: { winner: unknown[]; noWinner: unknown[] } = {
    winner: [],
    noWinner: [],
  };
  for (const artifact of artifacts) {
    const winnerSubmission = await submitArtifact(
      winner.address,
      artifact.contentHash,
      artifact.privateKey,
    );
    submissions.winner.push({
      ...winnerSubmission,
      explorerUrl: explorerTx(winnerSubmission.hash),
      contentHash: artifact.contentHash,
      builder: artifact.builder,
    });
    const noWinnerSubmission = await submitArtifact(
      noWinner.address,
      artifact.contentHash,
      artifact.privateKey,
    );
    submissions.noWinner.push({
      ...noWinnerSubmission,
      explorerUrl: explorerTx(noWinnerSubmission.hash),
      contentHash: artifact.contentHash,
      builder: artifact.builder,
    });
  }

  const run = {
    schemaVersion: 1,
    network: ARC_TESTNET.name,
    chainId,
    factory,
    recordedAt: new Date().toISOString(),
    publicWebBase,
    publicX402Url,
    client: deployer.address,
    evaluator: evaluator.address,
    prizeAtomic: prizeAtomic.toString(),
    contests: { winner, noWinner },
    agent: {
      address: agent.address,
      decision: result.decision.decision,
      decisionReasons: result.decision.reasons,
      providerLabel: result.artifact.providerLabel,
      x402Payment: result.analysis.payment,
    },
    artifacts: artifacts.map(({ privateKey: _privateKey, ...artifact }, index) => ({
      submissionId: String(index + 1),
      contentHash: artifact.contentHash,
      publicUrl: artifactUrl(artifact.contentHash),
      builder: artifact.builder,
      mode: artifact.mode,
      providerLabel: artifact.providerLabel,
      score: artifact.verification.score,
      qualified: artifact.verification.qualified,
      hardChecks: artifact.verification.checks,
    })),
    submissions,
    status: "submitted",
  };
  await mkdir(resolve(root, ".demo"), { recursive: true });
  await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: run.status,
        winnerContest: winner.address,
        noWinnerContest: noWinner.address,
        submissionDeadline,
        secondsUntilEvaluation: Math.max(0, submissionDeadline - Math.floor(Date.now() / 1_000)),
        paymentReceiptId: result.analysis.payment.receiptId,
        artifacts: run.artifacts.map((artifact) => ({
          contentHash: artifact.contentHash,
          publicUrl: artifact.publicUrl,
          mode: artifact.mode,
        })),
        submissions,
        runPath,
      },
      null,
      2,
    ),
  );
}

function decodeContestEvents(receipt: TransactionReceipt, contest: Address) {
  return receipt.logs
    .filter((log) => log.address.toLowerCase() === contest.toLowerCase())
    .flatMap((log) => {
      try {
        const decoded = decodeEventLog({
          abi: draftPayContestAbi,
          data: log.data,
          topics: log.topics,
        });
        return [
          {
            name: decoded.eventName,
            args: JSON.parse(
              JSON.stringify(decoded.args, (_key, value) =>
                typeof value === "bigint" ? value.toString() : value,
              ),
            ),
          },
        ];
      } catch {
        return [];
      }
    });
}

async function settle() {
  if (!existsSync(runPath)) throw new Error("Run prepare first");
  const run = JSON.parse(await readFile(runPath, "utf8")) as PersistedRun;
  if (run.status === "settled") throw new Error("Final contests are already settled");
  const deadline = Number(run.contests.winner.submissionDeadlineEpochSeconds);
  const block = await publicClient.getBlock();
  if (Number(block.timestamp) < deadline) {
    console.log(
      JSON.stringify(
        { status: "waiting", secondsRemaining: deadline - Number(block.timestamp), deadline },
        null,
        2,
      ),
    );
    return;
  }
  const assessments = run.artifacts.map((artifact, index) => ({
    submissionId: BigInt(artifact.submissionId),
    qualified: true,
    score: Math.max(90, Number(artifact.score) - index * 3),
    hardChecks: artifact.hardChecks.map((check) => ({
      id: check.id,
      passed: check.passed,
      detail: check.detail,
    })),
  }));
  const winnerEvaluations = await evaluateContestOnArc({
    contestAddress: run.contests.winner.address,
    privateKey: evaluatorKey,
    assessments,
    rpcUrl,
    readRpcUrl,
  });
  const noWinnerEvaluations = await evaluateContestOnArc({
    contestAddress: run.contests.noWinner.address,
    privateKey: evaluatorKey,
    assessments,
    rpcUrl,
    readRpcUrl,
  });

  const winnerHash = await deployerWallet.writeContract({
    address: run.contests.winner.address,
    abi: draftPayContestAbi,
    functionName: "selectWinner",
    args: [1n],
  });
  const winnerReceipt = await confirmed(winnerHash);
  const noWinnerHash = await deployerWallet.writeContract({
    address: run.contests.noWinner.address,
    abi: draftPayContestAbi,
    functionName: "settleNoWinner",
  });
  const noWinnerReceipt = await confirmed(noWinnerHash);
  const [winnerPayouts, noWinnerPayouts, winnerState, noWinnerState] = await Promise.all([
    publicClient.readContract({
      address: run.contests.winner.address,
      abi: draftPayContestAbi,
      functionName: "getPayouts",
    }),
    publicClient.readContract({
      address: run.contests.noWinner.address,
      abi: draftPayContestAbi,
      functionName: "getPayouts",
    }),
    publicClient.readContract({
      address: run.contests.winner.address,
      abi: draftPayContestAbi,
      functionName: "state",
    }),
    publicClient.readContract({
      address: run.contests.noWinner.address,
      abi: draftPayContestAbi,
      functionName: "state",
    }),
  ]);
  const normalizePayouts = (
    payouts: readonly { recipient: Address; amount: bigint; submissionId: bigint }[],
  ) =>
    payouts.map((payout) => ({
      recipient: payout.recipient,
      amountAtomic: payout.amount.toString(),
      amountUsdc: formatUnits(payout.amount, 6),
      submissionId: payout.submissionId.toString(),
    }));
  run.status = "settled";
  run.settledAt = new Date().toISOString();
  run.evaluations = {
    winner: winnerEvaluations.map((tx) => ({ ...tx, explorerUrl: explorerTx(tx.hash) })),
    noWinner: noWinnerEvaluations.map((tx) => ({ ...tx, explorerUrl: explorerTx(tx.hash) })),
  };
  run.settlements = {
    winner: {
      transactionHash: winnerHash,
      explorerUrl: explorerTx(winnerHash),
      blockNumber: winnerReceipt.blockNumber.toString(),
      state: Number(winnerState),
      events: decodeContestEvents(winnerReceipt, run.contests.winner.address),
      payouts: normalizePayouts(winnerPayouts),
    },
    noWinner: {
      transactionHash: noWinnerHash,
      explorerUrl: explorerTx(noWinnerHash),
      blockNumber: noWinnerReceipt.blockNumber.toString(),
      state: Number(noWinnerState),
      events: decodeContestEvents(noWinnerReceipt, run.contests.noWinner.address),
      payouts: normalizePayouts(noWinnerPayouts),
    },
  };
  await writeFile(runPath, `${JSON.stringify(run, null, 2)}\n`, "utf8");
  const publicEvidence = {
    schemaVersion: run.schemaVersion,
    network: run.network,
    chainId: run.chainId,
    factory: run.factory,
    recordedAt: run.recordedAt,
    settledAt: run.settledAt,
    publicX402Url: run.publicX402Url,
    contests: {
      winner: {
        address: run.contests.winner.address,
        funding: explorerTx(run.contests.winner.fundTransactionHash),
      },
      noWinner: {
        address: run.contests.noWinner.address,
        funding: explorerTx(run.contests.noWinner.fundTransactionHash),
      },
    },
    agent: run.agent,
    artifacts: run.artifacts,
    submissions: run.submissions,
    evaluations: run.evaluations,
    settlements: run.settlements,
  };
  await mkdir(publicEvidenceDirectory, { recursive: true });
  await mkdir(resolve(root, "docs", "evidence"), { recursive: true });
  await mkdir(resolve(root, "apps", "web", "data"), { recursive: true });
  const publicJson = `${JSON.stringify(publicEvidence, null, 2)}\n`;
  await writeFile(resolve(publicEvidenceDirectory, "final-run.json"), publicJson, "utf8");
  await writeFile(resolve(root, "docs", "evidence", "final-run.json"), publicJson, "utf8");
  await writeFile(resolve(root, "apps", "web", "data", "final-run.json"), publicJson, "utf8");
  console.log(
    JSON.stringify(
      {
        status: run.status,
        settlements: run.settlements,
        evidence: `${publicWebBase}/evidence/final-run.json`,
      },
      null,
      2,
    ),
  );
}

const command = process.argv[2];
if (command === "prepare") await prepare();
else if (command === "settle") await settle();
else throw new Error("Usage: tsx scripts/finalize-arc-testnet.ts <prepare|settle>");

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { ARC_TESTNET, ARC_TESTNET_RPC_URL, draftPayContestAbi } from "../packages/chain/src/index";
import { createPublicClient, createWalletClient, decodeEventLog, http, type Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = resolve(import.meta.dirname, "..");
const environmentPath = resolve(root, ".env.local");
if (!existsSync(environmentPath)) throw new Error(".env.local is required");
loadEnvFile(environmentPath);

const privateKey = process.env.DRAFTPAY_DEPLOYER_PRIVATE_KEY;
if (!privateKey || !/^0x[a-f\d]{64}$/i.test(privateKey)) {
  throw new Error("DRAFTPAY_DEPLOYER_PRIVATE_KEY is missing or invalid");
}

const deploymentPath = resolve(root, ".demo", "arc-deployment.json");
const deployment = JSON.parse(readFileSync(deploymentPath, "utf8")) as {
  contests?: Array<{ slug: string; address: Address }>;
};
const overrideAddress = process.env.DRAFTPAY_CONTEST_ADDRESS;
const contest = overrideAddress
  ? { slug: process.env.DRAFTPAY_CONTEST_SLUG ?? "no-winner", address: overrideAddress as Address }
  : deployment.contests?.find((candidate) => candidate.slug === "no-winner");
if (!contest) throw new Error("No no-winner contest was found in Arc deployment evidence");

const account = privateKeyToAccount(privateKey as `0x${string}`);
const rpcUrl = process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL;
const readRpcUrl =
  process.env.ARC_TESTNET_READ_RPC_URL ?? "https://draft-pay-web.vercel.app/api/rpc";
const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http(readRpcUrl) });
const walletClient = createWalletClient({ account, chain: ARC_TESTNET, transport: http(rpcUrl) });
const selectionDeadline = await publicClient.readContract({
  address: contest.address,
  abi: draftPayContestAbi,
  functionName: "selectionDeadline",
});
const latestBlock = await publicClient.getBlock();
if (latestBlock.timestamp <= selectionDeadline) {
  throw new Error(
    `No-winner settlement is available after ${selectionDeadline}; ${selectionDeadline - latestBlock.timestamp + 1n} seconds remain`,
  );
}

const transactionHash = await walletClient.writeContract({
  address: contest.address,
  abi: draftPayContestAbi,
  functionName: "settleNoWinner",
});
const receipt = await publicClient.waitForTransactionReceipt({ hash: transactionHash });
if (receipt.status !== "success") throw new Error(`Settlement reverted: ${transactionHash}`);
const events = receipt.logs
  .filter((log) => log.address.toLowerCase() === contest.address.toLowerCase())
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
            JSON.stringify(decoded.args, (_, value) =>
              typeof value === "bigint" ? value.toString() : value,
            ),
          ),
        },
      ];
    } catch {
      return [];
    }
  });

const evidence = {
  network: ARC_TESTNET.name,
  chainId: ARC_TESTNET.id,
  contest: contest.address,
  caller: account.address,
  transactionHash,
  blockNumber: receipt.blockNumber.toString(),
  events,
  recordedAt: new Date().toISOString(),
};
const evidenceDirectory = resolve(root, ".demo", "settlements");
await mkdir(evidenceDirectory, { recursive: true });
const evidencePath = resolve(evidenceDirectory, `${contest.slug}.json`);
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...evidence, evidencePath }, null, 2));

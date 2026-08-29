import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import {
  ARC_TESTNET,
  ARC_TESTNET_USDC_ADDRESS,
  usdcAbi,
} from "../packages/chain/src/index";
import { createPublicClient, formatEther, formatUnits, http, isHex, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const root = resolve(import.meta.dirname, "..");
const environmentPath = resolve(root, ".env.local");
if (!existsSync(environmentPath)) throw new Error(".env.local is required");
loadEnvFile(environmentPath);

const rpcUrl =
  process.env.ARC_TESTNET_READ_RPC_URL ??
  process.env.ARC_TESTNET_RPC_URL ??
  "https://draft-pay-web.vercel.app/api/rpc";
const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http(rpcUrl) });

const walletKeys = [
  ["deployer", process.env.DRAFTPAY_DEPLOYER_PRIVATE_KEY],
  ["builder", process.env.AGENT_PRIVATE_KEY],
  ["evaluator", process.env.EVALUATOR_PRIVATE_KEY],
] as const;

const wallets = [];
for (const [role, privateKey] of walletKeys) {
  if (!privateKey || !isHex(privateKey) || privateKey.length !== 66) {
    wallets.push({ role, configured: false });
    continue;
  }
  const account = privateKeyToAccount(privateKey as Hex);
  const nativeAtomic = await publicClient.getBalance({ address: account.address });
  const usdcAtomic = await publicClient.readContract({
    address: ARC_TESTNET_USDC_ADDRESS,
    abi: usdcAbi,
    functionName: "balanceOf",
    args: [account.address],
  });
  wallets.push({
    role,
    configured: true,
    address: account.address,
    nativeGasUsdc: formatEther(nativeAtomic),
    erc20Usdc: formatUnits(usdcAtomic, 6),
  });
}

console.log(
  JSON.stringify({ network: ARC_TESTNET.name, chainId: ARC_TESTNET.id, wallets }, null, 2),
);

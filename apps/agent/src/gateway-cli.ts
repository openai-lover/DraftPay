import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { isHex, type Hex } from "viem";

const environmentPath = resolve(import.meta.dirname, "../../..", ".env.local");
if (existsSync(environmentPath)) loadEnvFile(environmentPath);

const privateKey = process.env.AGENT_PRIVATE_KEY;
if (!privateKey || !isHex(privateKey) || privateKey.length !== 66) {
  throw new Error("A valid AGENT_PRIVATE_KEY is required");
}

const gateway = new GatewayClient({ chain: "arcTestnet", privateKey: privateKey as Hex });
const before = await gateway.getBalances();
let deposit = null;

if (process.argv.includes("--deposit")) {
  const amount = process.env.GATEWAY_DEPOSIT_USDC ?? "1";
  deposit = await gateway.deposit(amount);
}

const after = deposit ? await gateway.getBalances() : before;
console.log(
  JSON.stringify(
    {
      network: "arcTestnet",
      address: gateway.address,
      before: {
        wallet: before.wallet.formatted,
        gatewayAvailable: before.gateway.formattedAvailable,
      },
      deposit: deposit
        ? {
            approvalTransactionHash: deposit.approvalTxHash ?? null,
            depositTransactionHash: deposit.depositTxHash,
            amount: deposit.formattedAmount,
          }
        : null,
      after: {
        wallet: after.wallet.formatted,
        gatewayAvailable: after.gateway.formattedAvailable,
      },
    },
    null,
    2,
  ),
);

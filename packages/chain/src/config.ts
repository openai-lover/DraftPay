import { getAddress, isAddress, isHash, type Address, type Hash } from "viem";
import { arcTestnet } from "viem/chains";

export const ARC_TESTNET = arcTestnet;
export const ARC_TESTNET_CHAIN_ID = 5_042_002;
export const ARC_TESTNET_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_TESTNET_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_TESTNET_USDC_ADDRESS = getAddress("0x3600000000000000000000000000000000000000");
export const ARC_TESTNET_USDC_DECIMALS = 6;
export const ARC_TESTNET_ERC8183_REFERENCE = getAddress(
  "0x0747EEf0706327138c69792bF28Cd525089e4583",
);

if (ARC_TESTNET.id !== ARC_TESTNET_CHAIN_ID) {
  throw new Error("Installed viem Arc Testnet definition does not match verified chain ID");
}

export function assertArcTestnet(chainId: number): asserts chainId is typeof ARC_TESTNET_CHAIN_ID {
  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(
      `Wrong network: expected Arc Testnet ${ARC_TESTNET_CHAIN_ID}, received ${chainId}`,
    );
  }
}

export function parseOptionalAddress(value: string | undefined): Address | null {
  if (!value) return null;
  if (!isAddress(value)) throw new Error("Configured DraftPay address is not a valid EVM address");
  return getAddress(value);
}

export function transactionExplorerUrl(hash: string): string {
  if (!isHash(hash)) throw new Error("Cannot create explorer URL for an invalid transaction hash");
  return `${ARC_TESTNET_EXPLORER_URL}/tx/${hash as Hash}`;
}

export function addressExplorerUrl(address: string): string {
  if (!isAddress(address)) throw new Error("Cannot create explorer URL for an invalid address");
  return `${ARC_TESTNET_EXPLORER_URL}/address/${getAddress(address)}`;
}

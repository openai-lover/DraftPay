import {
  ARC_TESTNET_CHAIN_ID,
  ARC_TESTNET_GATEWAY_WALLET_ADDRESS,
  ARC_TESTNET_RPC_URL,
  ARC_TESTNET_USDC_ADDRESS,
  ARC_TESTNET_USDC_DECIMALS,
} from "@draftpay/chain";

const DECIMALS_CALL_DATA = "0x313ce567";

type RpcResponse = {
  id: number;
  jsonrpc: "2.0";
  result?: string;
  error?: { code: number; message: string };
};

type FetchLike = typeof fetch;

export type ArcNetworkProof = {
  status: "verified";
  checkedAt: string;
  latencyMs: number;
  chainId: number;
  blockNumber: string;
  rpcUrl: string;
  usdc: {
    address: string;
    decimals: number;
    contractCodePresent: boolean;
  };
  gatewayWallet: {
    address: string;
    contractCodePresent: boolean;
  };
};

function requireResult(responses: RpcResponse[], id: number): string {
  const response = responses.find((candidate) => candidate.id === id);
  if (!response || response.error || typeof response.result !== "string") {
    throw new Error(`Arc RPC proof call ${id} failed`);
  }
  return response.result;
}

function hasContractCode(value: string): boolean {
  return value !== "0x" && value !== "0x0";
}

export async function fetchArcNetworkProof(
  fetchImpl: FetchLike = fetch,
  rpcUrl = process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL,
): Promise<ArcNetworkProof> {
  const startedAt = Date.now();
  const response = await fetchImpl(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify([
      { id: 1, jsonrpc: "2.0", method: "eth_chainId", params: [] },
      { id: 2, jsonrpc: "2.0", method: "eth_blockNumber", params: [] },
      {
        id: 3,
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{ to: ARC_TESTNET_USDC_ADDRESS, data: DECIMALS_CALL_DATA }, "latest"],
      },
      {
        id: 4,
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [ARC_TESTNET_USDC_ADDRESS, "latest"],
      },
      {
        id: 5,
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [ARC_TESTNET_GATEWAY_WALLET_ADDRESS, "latest"],
      },
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });

  if (!response.ok) throw new Error(`Arc RPC returned HTTP ${response.status}`);

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error("Arc RPC returned an invalid proof response");

  const responses = payload as RpcResponse[];
  const chainId = Number(BigInt(requireResult(responses, 1)));
  const blockNumber = BigInt(requireResult(responses, 2)).toString();
  const decimals = Number(BigInt(requireResult(responses, 3)));
  const usdcCode = requireResult(responses, 4);
  const gatewayCode = requireResult(responses, 5);

  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    throw new Error(`Arc RPC chain mismatch: received ${chainId}`);
  }
  if (decimals !== ARC_TESTNET_USDC_DECIMALS) {
    throw new Error(`Arc USDC decimals mismatch: received ${decimals}`);
  }
  if (!hasContractCode(usdcCode) || !hasContractCode(gatewayCode)) {
    throw new Error("Arc USDC or Circle Gateway contract code is missing");
  }

  return {
    status: "verified",
    checkedAt: new Date().toISOString(),
    latencyMs: Date.now() - startedAt,
    chainId,
    blockNumber,
    rpcUrl,
    usdc: {
      address: ARC_TESTNET_USDC_ADDRESS,
      decimals,
      contractCodePresent: true,
    },
    gatewayWallet: {
      address: ARC_TESTNET_GATEWAY_WALLET_ADDRESS,
      contractCodePresent: true,
    },
  };
}

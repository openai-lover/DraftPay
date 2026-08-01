const allowedMethods = new Set([
  "eth_blockNumber",
  "eth_call",
  "eth_chainId",
  "eth_estimateGas",
  "eth_feeHistory",
  "eth_gasPrice",
  "eth_getBalance",
  "eth_getBlockByNumber",
  "eth_getCode",
  "eth_getTransactionByHash",
  "eth_getTransactionCount",
  "eth_getTransactionReceipt",
  "eth_maxPriorityFeePerGas",
]);

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown[];
}

function isJsonRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Record<string, unknown>;
  return (
    request.jsonrpc === "2.0" &&
    (request.id === undefined ||
      request.id === null ||
      typeof request.id === "string" ||
      typeof request.id === "number") &&
    typeof request.method === "string" &&
    allowedMethods.has(request.method) &&
    (request.params === undefined || Array.isArray(request.params))
  );
}

export function parseReadOnlyRpcPayload(value: unknown): JsonRpcRequest | JsonRpcRequest[] | null {
  if (Array.isArray(value)) {
    if (value.length === 0 || value.length > 20 || !value.every(isJsonRpcRequest)) return null;
    return value;
  }
  return isJsonRpcRequest(value) ? value : null;
}

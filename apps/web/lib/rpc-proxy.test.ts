import { describe, expect, it } from "vitest";
import { parseReadOnlyRpcPayload } from "./rpc-proxy";

describe("read-only Arc RPC proxy", () => {
  it("accepts bounded read requests", () => {
    expect(
      parseReadOnlyRpcPayload({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: "0x0000000000000000000000000000000000000000", data: "0x" }, "latest"],
      }),
    ).not.toBeNull();
  });

  it("rejects transaction submission", () => {
    expect(
      parseReadOnlyRpcPayload({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendRawTransaction",
        params: ["0xdeadbeef"],
      }),
    ).toBeNull();
  });

  it("rejects oversized batches", () => {
    const request = { jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] };
    expect(parseReadOnlyRpcPayload(Array.from({ length: 21 }, () => request))).toBeNull();
  });
});

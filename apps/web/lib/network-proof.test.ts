import { describe, expect, it, vi } from "vitest";
import { fetchArcNetworkProof } from "./network-proof";

describe("Arc network proof", () => {
  it("verifies the chain, USDC interface, and Circle Gateway contract", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 5, jsonrpc: "2.0", result: "0x6001" },
          { id: 2, jsonrpc: "2.0", result: "0x2a" },
          { id: 1, jsonrpc: "2.0", result: "0x4cef52" },
          { id: 4, jsonrpc: "2.0", result: "0x6002" },
          { id: 3, jsonrpc: "2.0", result: "0x06" },
        ]),
        { status: 200 },
      ),
    );

    const proof = await fetchArcNetworkProof(fetchImpl, "https://rpc.example");

    expect(proof.chainId).toBe(5_042_002);
    expect(proof.blockNumber).toBe("42");
    expect(proof.usdc.decimals).toBe(6);
    expect(proof.usdc.contractCodePresent).toBe(true);
    expect(proof.gatewayWallet.contractCodePresent).toBe(true);
  });

  it("rejects an RPC that identifies as another chain", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify([
          { id: 1, jsonrpc: "2.0", result: "0x1" },
          { id: 2, jsonrpc: "2.0", result: "0x2a" },
          { id: 3, jsonrpc: "2.0", result: "0x06" },
          { id: 4, jsonrpc: "2.0", result: "0x6002" },
          { id: 5, jsonrpc: "2.0", result: "0x6001" },
        ]),
        { status: 200 },
      ),
    );

    await expect(fetchArcNetworkProof(fetchImpl, "https://rpc.example")).rejects.toThrow(
      "chain mismatch",
    );
  });
});

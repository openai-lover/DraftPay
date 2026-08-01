import { afterEach, describe, expect, it, vi } from "vitest";
import { SpendingPolicy } from "./spending-policy";
import { CircleGatewayX402Client } from "./x402-client";

afterEach(() => vi.restoreAllMocks());

describe("Circle Gateway x402 client", () => {
  it("quotes a POST resource from its Payment-Required header", async () => {
    const requirements = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:5042002",
          amount: "10000",
          extra: { name: "GatewayWalletBatched", version: "1" },
        },
      ],
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 402,
        headers: {
          "payment-required": Buffer.from(JSON.stringify(requirements)).toString("base64"),
        },
      }),
    );
    const request = {
      brief: "Build a responsive product landing page for a finance operations team.",
      requirements: ["hero", "pricing", "contact form", "mobile"],
    };
    const client = new CircleGatewayX402Client(
      "https://seller.example/x402/brief-analysis",
      new SpendingPolicy({
        maxPaymentPerRequestAtomic: 50_000n,
        maxSessionSpendAtomic: 100_000n,
        maxDailySpendAtomic: 500_000n,
        allowedOrigins: ["https://seller.example"],
        emergencyDisabled: false,
      }),
      `0x${"11".repeat(32)}`,
    );

    await expect(client.quote(request)).resolves.toBe("10000");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://seller.example/x402/brief-analysis",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(request),
      }),
    );
  });
});

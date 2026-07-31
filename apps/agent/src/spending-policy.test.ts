import { describe, expect, it } from "vitest";
import { SpendingPolicy } from "./spending-policy";

describe("x402 spending policy", () => {
  it("records only verified in-policy payments", () => {
    const policy = new SpendingPolicy({
      maxPaymentPerRequestAtomic: 50_000n,
      maxSessionSpendAtomic: 100_000n,
      maxDailySpendAtomic: 500_000n,
      allowedOrigins: ["https://tools.draftpay.test"],
      emergencyDisabled: false,
    });
    policy.assertCanSpend("https://tools.draftpay.test/x402/brief-analysis", 50_000n);
    policy.recordVerifiedPayment(50_000n);
    expect(policy.sessionSpend).toBe(50_000n);
    expect(() => policy.assertCanSpend("https://evil.test/tool", 1n)).toThrow("allowlisted");
    expect(() => policy.assertCanSpend("https://tools.draftpay.test/tool", 50_001n)).toThrow(
      "per-request",
    );
  });

  it("obeys emergency disable", () => {
    const policy = new SpendingPolicy({
      maxPaymentPerRequestAtomic: 1n,
      maxSessionSpendAtomic: 1n,
      maxDailySpendAtomic: 1n,
      allowedOrigins: ["https://tools.draftpay.test"],
      emergencyDisabled: true,
    });
    expect(() => policy.assertCanSpend("https://tools.draftpay.test/tool", 1n)).toThrow(
      "emergency-disabled",
    );
  });
});

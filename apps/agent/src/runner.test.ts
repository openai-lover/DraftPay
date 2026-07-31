import { demoContest } from "@draftpay/shared";
import { describe, expect, it } from "vitest";
import { FixtureModelAdapter } from "./model-adapter";
import { runBuilderAgent } from "./runner";
import { FixtureX402Client, type X402BriefClient } from "./x402-client";

describe("Builder Agent fixture runner", () => {
  it("prepares and verifies a static fixture without claiming a payment", async () => {
    const result = await runBuilderAgent({
      contest: {
        ...demoContest,
        state: "submission-open",
        submissionDeadline: "2030-01-01T00:00:00.000Z",
      },
      decision: {
        nowEpochSeconds: 1_000,
        generationCostAtomic: "80000",
        verificationCostAtomic: "50000",
        qualificationProbabilityBps: 7_200,
        minimumExpectedValueAtomic: "1000000",
        minimumLeadTimeSeconds: 5_400,
        maxPaymentPerRequestAtomic: "50000",
        maxSessionSpendAtomic: "100000",
        spentThisSessionAtomic: "0",
        maxDailySpendAtomic: "5000000",
        spentTodayAtomic: "0",
        availableTools: ["static-page-generator", "deterministic-verifier", "x402-client"],
      },
      model: new FixtureModelAdapter(),
      x402: new FixtureX402Client(),
      knownContentHashes: [],
    });
    expect(result.decision.decision).toBe("participate");
    expect(result.artifact?.mode).toBe("fixture");
    expect(result.verification?.qualified).toBe(true);
    expect(result.analysis?.payment.paymentOccurred).toBe(false);
  });

  it("uses the advertised x402 quote in the final decision before paying", async () => {
    let paid = false;
    const expensiveTool: X402BriefClient = {
      quote: async () => "50001",
      analyze: async () => {
        paid = true;
        throw new Error("analyze should not be called after an over-limit quote");
      },
    };
    const result = await runBuilderAgent({
      contest: {
        ...demoContest,
        state: "submission-open",
        submissionDeadline: "2030-01-01T00:00:00.000Z",
      },
      decision: {
        nowEpochSeconds: 1_000,
        generationCostAtomic: "80000",
        verificationCostAtomic: "50000",
        qualificationProbabilityBps: 7_200,
        minimumExpectedValueAtomic: "1000000",
        minimumLeadTimeSeconds: 5_400,
        maxPaymentPerRequestAtomic: "50000",
        maxSessionSpendAtomic: "100000",
        spentThisSessionAtomic: "0",
        maxDailySpendAtomic: "5000000",
        spentTodayAtomic: "0",
        availableTools: ["static-page-generator", "deterministic-verifier", "x402-client"],
      },
      model: new FixtureModelAdapter(),
      x402: expensiveTool,
      knownContentHashes: [],
    });

    expect(result.decision.decision).toBe("skip");
    expect(result.decision.metrics.estimatedX402CostAtomic).toBe("50001");
    expect(result.analysis).toBeNull();
    expect(paid).toBe(false);
  });
});

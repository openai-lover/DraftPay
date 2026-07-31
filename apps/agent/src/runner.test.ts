import { analyzeBrief, demoContest } from "@draftpay/shared";
import { describe, expect, it } from "vitest";
import { FixtureModelAdapter, type GenerationBrief, type ModelAdapter } from "./model-adapter";
import { runBuilderAgent } from "./runner";
import {
  FixtureX402Client,
  type PaidBriefAnalysisResult,
  type X402BriefClient,
} from "./x402-client";

const openContest = {
  ...demoContest,
  state: "submission-open" as const,
  submissionDeadline: "2030-01-01T00:00:00.000Z",
};

const baseDecision = {
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
};

function stubTool(analysis: PaidBriefAnalysisResult["analysis"], quote = "10000"): X402BriefClient {
  return {
    quote: async () => quote,
    analyze: async () => ({
      analysis,
      payment: {
        mode: "fixture",
        paymentOccurred: false,
        quotedAmountAtomic: quote,
        amountAtomic: "0",
        network: "eip155:5042002",
        payer: null,
        receiptId: null,
        serviceUrl: "stub://brief-analysis",
        status: "fixture",
      },
    }),
  };
}

class RecordingModelAdapter implements ModelAdapter {
  briefs: GenerationBrief[] = [];
  private readonly inner = new FixtureModelAdapter();
  async generateLandingPage(brief: GenerationBrief) {
    this.briefs.push(brief);
    return this.inner.generateLandingPage(brief);
  }
}

describe("Builder Agent fixture runner", () => {
  it("prepares and verifies a static fixture without claiming a payment", async () => {
    const result = await runBuilderAgent({
      contest: openContest,
      decision: baseDecision,
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
      contest: openContest,
      decision: baseDecision,
      model: new FixtureModelAdapter(),
      x402: expensiveTool,
      knownContentHashes: [],
    });

    expect(result.decision.decision).toBe("skip");
    expect(result.decision.metrics.estimatedX402CostAtomic).toBe("50001");
    expect(result.analysis).toBeNull();
    expect(paid).toBe(false);
  });

  it("prices a non-zero quote on the fixture path", async () => {
    const result = await runBuilderAgent({
      contest: openContest,
      decision: baseDecision,
      model: new FixtureModelAdapter(),
      x402: new FixtureX402Client(),
      knownContentHashes: [],
    });
    expect(result.decision.metrics.estimatedX402CostAtomic).toBe("10000");
    expect(result.analysis?.payment.quotedAmountAtomic).toBe("10000");
  });

  it("recalibrates the qualification prior from the analysis it paid for", async () => {
    const result = await runBuilderAgent({
      contest: openContest,
      decision: baseDecision,
      model: new FixtureModelAdapter(),
      x402: new FixtureX402Client(),
      knownContentHashes: [],
    });

    expect(result.probability?.baseBps).toBe(7_200);
    expect(result.probability?.adjustedBps).toBeLessThan(7_200);
    expect(result.probability?.adjustments.length).toBeGreaterThan(0);
    expect(result.decision.metrics.qualificationProbabilityBps).toBe(
      result.probability?.adjustedBps,
    );
    expect(BigInt(result.decision.metrics.expectedValueAtomic)).toBeLessThan(
      BigInt(result.quotedDecision!.metrics.expectedValueAtomic),
    );
  });

  it("adopts the purchased build-cost estimate over its own static guess", async () => {
    const result = await runBuilderAgent({
      contest: openContest,
      decision: baseDecision,
      model: new FixtureModelAdapter(),
      x402: new FixtureX402Client(),
      knownContentHashes: [],
    });
    const purchased = analyzeBrief({
      brief: openContest.brief,
      requirements: openContest.requirements.map((requirement) => requirement.label),
    });
    expect(result.decision.metrics.estimatedGenerationCostAtomic).toBe(
      purchased.estimatedBuildCostAtomic,
    );
    expect(result.decision.metrics.estimatedGenerationCostAtomic).not.toBe("80000");
  });

  it("passes the analysis findings into generation", async () => {
    const model = new RecordingModelAdapter();
    const gaps = { ...analyzeBrief({ brief: openContest.brief, requirements: ["only one hint"] }) };
    await runBuilderAgent({
      contest: openContest,
      decision: { ...baseDecision, qualificationProbabilityBps: 9_500 },
      model,
      x402: stubTool({ ...gaps, riskScore: 20, missingRequirements: ["pricing", "contact form"] }),
      knownContentHashes: [],
    });

    expect(model.briefs).toHaveLength(1);
    expect(model.briefs[0]?.focusRequirements).toEqual(["pricing", "contact form"]);
    expect(model.briefs[0]?.requiredHeadline).toBe(openContest.requiredHeadline);
  });

  it("walks away when the paid analysis destroys the economics", async () => {
    const model = new RecordingModelAdapter();
    const result = await runBuilderAgent({
      contest: openContest,
      decision: { ...baseDecision, minimumExpectedValueAtomic: "60000000" },
      model,
      x402: stubTool({
        complexity: "high",
        missingRequirements: ["hero", "pricing", "call to action", "contact form", "mobile"],
        estimatedBuildCostAtomic: "180000",
        estimatedBuildMinutes: 28,
        riskScore: 95,
      }),
      knownContentHashes: [],
    });

    expect(result.quotedDecision?.decision).toBe("participate");
    expect(result.decision.decision).toBe("skip");
    expect(result.abandonedAfterPaidAnalysis).toBe(true);
    expect(result.analysis).not.toBeNull();
    expect(result.artifact).toBeNull();
    expect(model.briefs).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { decideParticipation, type AgentDecisionInput } from "./decision";

const viable: AgentDecisionInput = {
  category: "responsive-landing-page",
  contestOpen: true,
  prizeAtomic: "100000000",
  nowEpochSeconds: 1_000,
  submissionDeadlineEpochSeconds: 100_000,
  generationCostAtomic: "80000",
  verificationCostAtomic: "50000",
  x402CostAtomic: "10000",
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

describe("Builder Agent decision", () => {
  it("participates when economics, budget, time, and tools pass", () => {
    const record = decideParticipation(viable);
    expect(record.decision).toBe("participate");
    expect(BigInt(record.metrics.expectedValueAtomic)).toBeGreaterThan(0n);
  });

  it.each([
    ["unsupported category", { category: "mobile-app" }, "Category is not supported"],
    ["closed contest", { contestOpen: false }, "Contest is not accepting submissions"],
    ["short deadline", { submissionDeadlineEpochSeconds: 1_100 }, "Insufficient time remaining"],
    ["high per-request price", { x402CostAtomic: "50001" }, "Tool price exceeds per-request limit"],
    [
      "session budget",
      { spentThisSessionAtomic: "95000" },
      "Tool price exceeds remaining session budget",
    ],
    [
      "daily wallet budget",
      { spentTodayAtomic: "4995000" },
      "Tool price exceeds remaining daily wallet budget",
    ],
    ["missing tool", { availableTools: [] }, "A required tool is unavailable"],
    [
      "negative economics",
      { minimumExpectedValueAtomic: "100000000" },
      "Expected value is below threshold",
    ],
  ])("skips for %s", (_label, override, reason) => {
    const record = decideParticipation({ ...viable, ...override });
    expect(record.decision).toBe("skip");
    expect(record.reasons).toContain(reason);
  });
});

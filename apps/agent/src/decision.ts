const BPS = 10_000n;
const WINNER_SHARE_BPS = 9_500n;

export interface AgentDecisionInput {
  category: string;
  contestOpen: boolean;
  prizeAtomic: string;
  nowEpochSeconds: number;
  submissionDeadlineEpochSeconds: number;
  generationCostAtomic: string;
  verificationCostAtomic: string;
  x402CostAtomic: string;
  qualificationProbabilityBps: number;
  minimumExpectedValueAtomic: string;
  minimumLeadTimeSeconds: number;
  maxPaymentPerRequestAtomic: string;
  maxSessionSpendAtomic: string;
  spentThisSessionAtomic: string;
  maxDailySpendAtomic: string;
  spentTodayAtomic: string;
  availableTools: string[];
}

export interface AgentDecisionRecord {
  decision: "participate" | "skip";
  reasons: string[];
  metrics: {
    supportedCategory: boolean;
    contestOpen: boolean;
    prizeAtomic: string;
    timeRemainingSeconds: number;
    estimatedGenerationCostAtomic: string;
    estimatedVerificationCostAtomic: string;
    estimatedX402CostAtomic: string;
    qualificationProbabilityBps: number;
    estimatedRewardAtomic: string;
    expectedValueAtomic: string;
    remainingSessionBudgetAtomic: string;
    remainingDailyBudgetAtomic: string;
    requiredToolsAvailable: boolean;
  };
}

const REQUIRED_TOOLS = ["static-page-generator", "deterministic-verifier", "x402-client"];

export function decideParticipation(input: AgentDecisionInput): AgentDecisionRecord {
  if (
    !Number.isInteger(input.qualificationProbabilityBps) ||
    input.qualificationProbabilityBps < 0 ||
    input.qualificationProbabilityBps > 10_000
  ) {
    throw new Error("Qualification probability must be integer basis points from 0 to 10,000");
  }

  const prize = BigInt(input.prizeAtomic);
  const generationCost = BigInt(input.generationCostAtomic);
  const verificationCost = BigInt(input.verificationCostAtomic);
  const x402Cost = BigInt(input.x402CostAtomic);
  const spent = BigInt(input.spentThisSessionAtomic);
  const sessionLimit = BigInt(input.maxSessionSpendAtomic);
  const remainingBudget = sessionLimit > spent ? sessionLimit - spent : 0n;
  const spentToday = BigInt(input.spentTodayAtomic);
  const dailyLimit = BigInt(input.maxDailySpendAtomic);
  const remainingDailyBudget = dailyLimit > spentToday ? dailyLimit - spentToday : 0n;
  const timeRemaining = Math.max(0, input.submissionDeadlineEpochSeconds - input.nowEpochSeconds);
  const supportedCategory = input.category === "responsive-landing-page";
  const toolsAvailable = REQUIRED_TOOLS.every((tool) => input.availableTools.includes(tool));
  const estimatedReward = (prize * WINNER_SHARE_BPS) / BPS;
  const probabilityWeightedReward =
    (estimatedReward * BigInt(input.qualificationProbabilityBps)) / BPS;
  const expectedValue = probabilityWeightedReward - generationCost - verificationCost - x402Cost;

  const reasons: string[] = [];
  if (!supportedCategory) reasons.push("Category is not supported");
  if (!input.contestOpen) reasons.push("Contest is not accepting submissions");
  if (timeRemaining < input.minimumLeadTimeSeconds) reasons.push("Insufficient time remaining");
  if (x402Cost > BigInt(input.maxPaymentPerRequestAtomic))
    reasons.push("Tool price exceeds per-request limit");
  if (x402Cost > remainingBudget) reasons.push("Tool price exceeds remaining session budget");
  if (x402Cost > remainingDailyBudget)
    reasons.push("Tool price exceeds remaining daily wallet budget");
  if (!toolsAvailable) reasons.push("A required tool is unavailable");
  if (expectedValue < BigInt(input.minimumExpectedValueAtomic))
    reasons.push("Expected value is below threshold");
  if (reasons.length === 0)
    reasons.push("Supported task, sufficient time, budget, tools, and expected value");

  return {
    decision:
      reasons.length === 1 && reasons[0]?.startsWith("Supported task") ? "participate" : "skip",
    reasons,
    metrics: {
      supportedCategory,
      contestOpen: input.contestOpen,
      prizeAtomic: prize.toString(),
      timeRemainingSeconds: timeRemaining,
      estimatedGenerationCostAtomic: generationCost.toString(),
      estimatedVerificationCostAtomic: verificationCost.toString(),
      estimatedX402CostAtomic: x402Cost.toString(),
      qualificationProbabilityBps: input.qualificationProbabilityBps,
      estimatedRewardAtomic: estimatedReward.toString(),
      expectedValueAtomic: expectedValue.toString(),
      remainingSessionBudgetAtomic: remainingBudget.toString(),
      remainingDailyBudgetAtomic: remainingDailyBudget.toString(),
      requiredToolsAvailable: toolsAvailable,
    },
  };
}

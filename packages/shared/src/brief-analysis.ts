import {
  briefAnalysisRequestSchema,
  briefAnalysisResponseSchema,
  type BriefAnalysisRequest,
  type BriefAnalysisResponse,
} from "./schemas";

const CANONICAL_REQUIREMENTS = [
  { label: "hero", aliases: ["hero"] },
  { label: "pricing", aliases: ["pricing"] },
  { label: "call to action", aliases: ["call to action", "call-to-action", "cta"] },
  { label: "contact form", aliases: ["contact form", "email form"] },
  { label: "mobile", aliases: ["mobile", "responsive", "390px"] },
] as const;

export function analyzeBrief(input: BriefAnalysisRequest): BriefAnalysisResponse {
  const parsed = briefAnalysisRequestSchema.parse(input);
  const searchable = `${parsed.brief} ${parsed.requirements.join(" ")}`.toLowerCase();
  const missingRequirements = CANONICAL_REQUIREMENTS.filter(
    (requirement) => !requirement.aliases.some((alias) => searchable.includes(alias)),
  ).map((requirement) => requirement.label);
  const score = parsed.brief.length + parsed.requirements.length * 80;
  const complexity = score > 1_000 ? "high" : score > 520 ? "medium" : "low";
  const riskScore = Math.min(
    95,
    18 + missingRequirements.length * 14 + (complexity === "high" ? 12 : 0),
  );

  return {
    complexity,
    missingRequirements,
    estimatedBuildCostAtomic:
      complexity === "high" ? "180000" : complexity === "medium" ? "110000" : "65000",
    estimatedBuildMinutes: complexity === "high" ? 28 : complexity === "medium" ? 16 : 9,
    riskScore,
  };
}

export const MIN_CALIBRATED_PROBABILITY_BPS = 500;
export const MAX_CALIBRATED_PROBABILITY_BPS = 9_500;

const RISK_BPS_PER_POINT = 25;
const MISSING_REQUIREMENT_BPS = 600;
const COMPLEXITY_BPS: Record<BriefAnalysisResponse["complexity"], number> = {
  low: 0,
  medium: 300,
  high: 900,
};

export interface ProbabilityAdjustment {
  label: string;
  deltaBps: number;
}

export interface CalibratedProbability {
  baseBps: number;
  adjustedBps: number;
  adjustments: ProbabilityAdjustment[];
}

/**
 * Converts a purchased brief analysis into a calibrated qualification probability.
 *
 * The prior is the agent's own configured expectation. Every adjustment below is derived
 * only from data the agent paid for over x402, so the purchase has a measurable effect on
 * the participation decision rather than being recorded and discarded.
 */
export function calibrateQualificationProbability(
  baseBps: number,
  analysis: BriefAnalysisResponse,
): CalibratedProbability {
  if (!Number.isInteger(baseBps) || baseBps < 0 || baseBps > 10_000) {
    throw new Error("Base qualification probability must be integer basis points from 0 to 10,000");
  }
  const parsed = briefAnalysisResponseSchema.parse(analysis);

  const adjustments: ProbabilityAdjustment[] = [];
  if (parsed.riskScore > 0) {
    adjustments.push({
      label: `Paid analysis risk score ${parsed.riskScore}`,
      deltaBps: -parsed.riskScore * RISK_BPS_PER_POINT,
    });
  }
  if (parsed.missingRequirements.length > 0) {
    adjustments.push({
      label: `Brief omits ${parsed.missingRequirements.join(", ")}`,
      deltaBps: -parsed.missingRequirements.length * MISSING_REQUIREMENT_BPS,
    });
  }
  const complexityPenalty = COMPLEXITY_BPS[parsed.complexity];
  if (complexityPenalty > 0) {
    adjustments.push({
      label: `Paid analysis complexity ${parsed.complexity}`,
      deltaBps: -complexityPenalty,
    });
  }

  const raw = adjustments.reduce((total, adjustment) => total + adjustment.deltaBps, baseBps);
  const adjustedBps = Math.max(
    MIN_CALIBRATED_PROBABILITY_BPS,
    Math.min(MAX_CALIBRATED_PROBABILITY_BPS, raw),
  );

  return { baseBps, adjustedBps, adjustments };
}

import { z } from "zod";

export const briefAnalysisRequestSchema = z.object({
  brief: z.string().min(20).max(4_000),
  requirements: z.array(z.string().min(1).max(160)).min(1).max(16),
});

export type BriefAnalysisRequest = z.infer<typeof briefAnalysisRequestSchema>;

const CANONICAL_REQUIREMENTS = [
  { label: "hero", aliases: ["hero"] },
  { label: "pricing", aliases: ["pricing"] },
  { label: "call to action", aliases: ["call to action", "call-to-action", "cta"] },
  { label: "contact form", aliases: ["contact form", "email form"] },
  { label: "mobile", aliases: ["mobile", "responsive", "390px"] },
] as const;

export function analyzeBrief(input: BriefAnalysisRequest) {
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

import {
  calibrateQualificationProbability,
  type CalibratedProbability,
  type ContestSummary,
} from "@draftpay/shared";
import { keccak256, toBytes } from "viem";
import { decideParticipation, type AgentDecisionInput, type AgentDecisionRecord } from "./decision";
import { verifyLandingPageInBrowser } from "./browser-verifier";
import type { GenerationBrief, ModelAdapter } from "./model-adapter";
import { verifyLandingPage, type VerificationResult } from "./verification";
import type { PaidBriefAnalysisResult, X402BriefClient } from "./x402-client";

export interface BuilderRunInput {
  contest: ContestSummary;
  decision: Omit<
    AgentDecisionInput,
    "category" | "contestOpen" | "prizeAtomic" | "submissionDeadlineEpochSeconds" | "x402CostAtomic"
  >;
  model: ModelAdapter;
  x402: X402BriefClient;
  knownContentHashes: string[];
}

export interface BuilderRunResult {
  /** The decision the agent acted on. After a purchase this is the recalibrated one. */
  decision: AgentDecisionRecord;
  /** The decision as it stood on the advertised x402 price, before the analysis was bought. */
  quotedDecision: AgentDecisionRecord | null;
  /** How the purchased analysis moved the qualification prior. Null when nothing was bought. */
  probability: CalibratedProbability | null;
  analysis: PaidBriefAnalysisResult | null;
  /** True when the agent paid for analysis and the analysis told it to walk away. */
  abandonedAfterPaidAnalysis: boolean;
  artifact:
    | (Awaited<ReturnType<ModelAdapter["generateLandingPage"]>> & {
        contentHash: string;
        bytes: number;
      })
    | null;
  verification: VerificationResult | null;
}

export async function runBuilderAgent(input: BuilderRunInput): Promise<BuilderRunResult> {
  const commonDecisionInput = {
    ...input.decision,
    category: input.contest.category,
    contestOpen: input.contest.state === "submission-open",
    prizeAtomic: input.contest.prizeAtomic,
    submissionDeadlineEpochSeconds: Math.floor(
      new Date(input.contest.submissionDeadline).getTime() / 1_000,
    ),
  };

  const idle = {
    quotedDecision: null,
    probability: null,
    analysis: null,
    abandonedAfterPaidAnalysis: false,
    artifact: null,
    verification: null,
  } as const;

  // 1. Screen the contest before spending anything at all, including a quote request.
  const preliminaryDecision = decideParticipation({ ...commonDecisionInput, x402CostAtomic: "0" });
  if (preliminaryDecision.decision === "skip") return { ...idle, decision: preliminaryDecision };

  // 2. Price the tool, then re-decide against the advertised price before authorising payment.
  const analysisRequest = {
    brief: input.contest.brief,
    requirements: input.contest.requirements.map((requirement) => requirement.label),
  };
  const quotedX402CostAtomic = await input.x402.quote(analysisRequest);
  const quotedDecision = decideParticipation({
    ...commonDecisionInput,
    x402CostAtomic: quotedX402CostAtomic,
  });
  if (quotedDecision.decision === "skip") {
    return { ...idle, decision: quotedDecision, quotedDecision };
  }

  // 3. Buy the analysis.
  const analysis = await input.x402.analyze(analysisRequest);

  // 4. Spend the information: recalibrate the qualification prior and adopt the analysis's own
  //    build-cost estimate in place of the agent's static guess.
  const probability = calibrateQualificationProbability(
    input.decision.qualificationProbabilityBps,
    analysis.analysis,
  );
  const decision = decideParticipation({
    ...commonDecisionInput,
    x402CostAtomic: quotedX402CostAtomic,
    qualificationProbabilityBps: probability.adjustedBps,
    generationCostAtomic: analysis.analysis.estimatedBuildCostAtomic,
  });

  // 5. Honour it. A purchase that can only ever confirm the prior is not a decision.
  if (decision.decision === "skip") {
    return {
      decision,
      quotedDecision,
      probability,
      analysis,
      abandonedAfterPaidAnalysis: true,
      artifact: null,
      verification: null,
    };
  }

  // 6. Build against the analysis, not just the raw brief.
  const generationBrief: GenerationBrief = {
    specification: JSON.stringify(input.contest.requirements),
    requiredHeadline: input.contest.requiredHeadline,
    requiredSections: input.contest.requirements.map((requirement) => requirement.label),
    focusRequirements: analysis.analysis.missingRequirements,
    complexity: analysis.analysis.complexity,
    estimatedBuildMinutes: analysis.analysis.estimatedBuildMinutes,
  };
  const artifact = await input.model.generateLandingPage(generationBrief);
  const contentHash = keccak256(toBytes(artifact.html));
  const browser = await verifyLandingPageInBrowser(artifact.html);
  const verification = verifyLandingPage({
    html: artifact.html,
    requiredHeadline: input.contest.requiredHeadline,
    contentHash,
    knownContentHashes: input.knownContentHashes,
    browser,
  });

  return {
    decision,
    quotedDecision,
    probability,
    analysis,
    abandonedAfterPaidAnalysis: false,
    artifact: { ...artifact, contentHash, bytes: toBytes(artifact.html).byteLength },
    verification,
  };
}

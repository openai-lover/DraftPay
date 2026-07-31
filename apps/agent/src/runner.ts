import type { ContestSummary } from "@draftpay/shared";
import { keccak256, toBytes } from "viem";
import { decideParticipation, type AgentDecisionInput } from "./decision";
import type { ModelAdapter } from "./model-adapter";
import { verifyLandingPage } from "./verification";
import type { X402BriefClient } from "./x402-client";

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

export async function runBuilderAgent(input: BuilderRunInput) {
  const commonDecisionInput = {
    ...input.decision,
    category: input.contest.category,
    contestOpen: input.contest.state === "submission-open",
    prizeAtomic: input.contest.prizeAtomic,
    submissionDeadlineEpochSeconds: Math.floor(
      new Date(input.contest.submissionDeadline).getTime() / 1_000,
    ),
  };
  const preliminaryDecision = decideParticipation({
    ...commonDecisionInput,
    x402CostAtomic: "0",
  });
  if (preliminaryDecision.decision === "skip")
    return { decision: preliminaryDecision, artifact: null, analysis: null, verification: null };

  const quotedX402CostAtomic = await input.x402.quote();
  const decision = decideParticipation({
    ...commonDecisionInput,
    x402CostAtomic: quotedX402CostAtomic,
  });
  if (decision.decision === "skip")
    return { decision, artifact: null, analysis: null, verification: null };

  const paidAnalysis = await input.x402.analyze({
    brief: input.contest.brief,
    requirements: input.contest.requirements.map((requirement) => requirement.label),
  });
  const artifact = await input.model.generateLandingPage(
    JSON.stringify(input.contest.requirements),
  );
  const contentHash = keccak256(toBytes(artifact.html));
  const verification = verifyLandingPage({
    html: artifact.html,
    requiredHeadline: input.contest.requiredHeadline,
    contentHash,
    knownContentHashes: input.knownContentHashes,
    previewLoaded: true,
  });

  return {
    decision,
    analysis: paidAnalysis,
    artifact: { ...artifact, contentHash, bytes: toBytes(artifact.html).byteLength },
    verification,
  };
}

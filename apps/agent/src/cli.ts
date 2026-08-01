import { readFile } from "node:fs/promises";
import {
  approvedContestMetadataSchema,
  createDemoContest,
  type ContestSummary,
} from "@draftpay/shared";
import { isAddress, isHex, type Hex } from "viem";
import { artifactPublicUri, storeArtifact } from "./artifact-store";
import { appendEvidence } from "./evidence-store";
import { createModelAdapter } from "./model-adapter";
import { readContestOnArc } from "./read-contest";
import { runBuilderAgent } from "./runner";
import { SpendingPolicy } from "./spending-policy";
import { submitProofOnArc } from "./submit-proof";
import { CircleGatewayX402Client, FixtureX402Client } from "./x402-client";

const realMode = process.env.X402_MODE === "real";
const targetContest = process.env.AGENT_SUBMIT_CONTEST_ADDRESS;
const privateKey = process.env.AGENT_PRIVATE_KEY;
const policy = new SpendingPolicy({
  maxPaymentPerRequestAtomic: BigInt(process.env.X402_MAX_PAYMENT_ATOMIC ?? "50000"),
  maxSessionSpendAtomic: BigInt(process.env.X402_MAX_SESSION_SPEND_ATOMIC ?? "100000"),
  maxDailySpendAtomic: BigInt(process.env.X402_MAX_DAILY_SPEND_ATOMIC ?? "500000"),
  allowedOrigins: [process.env.X402_ALLOWED_ORIGIN ?? "http://localhost:3402"],
  emergencyDisabled: process.env.X402_EMERGENCY_DISABLED === "true",
});

if (
  (realMode || targetContest) &&
  (!privateKey || !isHex(privateKey) || privateKey.length !== 66)
) {
  throw new Error("A valid AGENT_PRIVATE_KEY is required for real x402 or proof submission");
}

const x402 = realMode
  ? new CircleGatewayX402Client(
      process.env.X402_SERVICE_URL ?? "http://localhost:3402/x402/brief-analysis",
      policy,
      privateKey as Hex,
    )
  : new FixtureX402Client();

let contest: ContestSummary = { ...createDemoContest(), state: "submission-open" };
if (targetContest) {
  if (targetContest && !isAddress(targetContest)) {
    throw new Error("AGENT_SUBMIT_CONTEST_ADDRESS is invalid");
  }
  const metadataPath = process.env.AGENT_CONTEST_METADATA_PATH;
  if (!metadataPath) {
    throw new Error("AGENT_CONTEST_METADATA_PATH is required for a real contest");
  }
  const metadata = approvedContestMetadataSchema.parse(
    JSON.parse(await readFile(metadataPath, "utf8")),
  );
  contest = await readContestOnArc({ contestAddress: targetContest, metadata });
}

const result = await runBuilderAgent({
  contest,
  decision: {
    nowEpochSeconds: Math.floor(Date.now() / 1_000),
    generationCostAtomic: "80000",
    verificationCostAtomic: "50000",
    qualificationProbabilityBps: 7_200,
    minimumExpectedValueAtomic: "1000000",
    minimumLeadTimeSeconds: 5_400,
    maxPaymentPerRequestAtomic: "50000",
    maxSessionSpendAtomic: "100000",
    spentThisSessionAtomic: "0",
    maxDailySpendAtomic: process.env.AGENT_MAX_DAILY_SPEND_ATOMIC ?? "5000000",
    spentTodayAtomic: "0",
    availableTools: ["static-page-generator", "deterministic-verifier", "x402-client"],
  },
  model: createModelAdapter(),
  x402,
  knownContentHashes: [],
});

await appendEvidence({
  kind: "agent-decision",
  mode: contest.mode,
  payload: {
    decision: result.decision.decision,
    reasons: result.decision.reasons,
    metrics: result.decision.metrics,
    quotedDecision: result.quotedDecision
      ? { decision: result.quotedDecision.decision, metrics: result.quotedDecision.metrics }
      : null,
    probability: result.probability,
    abandonedAfterPaidAnalysis: result.abandonedAfterPaidAnalysis,
  },
});
if (result.analysis) {
  await appendEvidence({
    kind: "tool-payment",
    mode: result.analysis.payment.mode,
    payload: {
      ...result.analysis.payment,
      analysis: result.analysis.analysis,
    },
  });
}

let artifactStorage = null;
if (result.artifact && result.verification) {
  const stored = await storeArtifact({
    contentHash: result.artifact.contentHash,
    html: result.artifact.html,
    mode: result.artifact.mode,
    providerLabel: result.artifact.providerLabel,
    checks: result.verification.checks,
    estimatedCostAtomic: (
      BigInt(result.decision.metrics.estimatedGenerationCostAtomic) +
      BigInt(result.decision.metrics.estimatedVerificationCostAtomic) +
      BigInt(result.decision.metrics.estimatedX402CostAtomic)
    ).toString(),
    toolPaymentReceiptId: result.analysis?.payment.receiptId ?? null,
  });
  artifactStorage = {
    contentHash: stored.contentHash,
    byteLength: stored.byteLength,
    screenshotStatus: "not-captured" as const,
  };
}

let submission = null;
if (
  targetContest &&
  result.artifact &&
  result.verification?.qualified &&
  privateKey &&
  isHex(privateKey)
) {
  if (!process.env.AGENT_ARTIFACT_BASE_URL) {
    throw new Error("AGENT_ARTIFACT_BASE_URL is required for a retrievable onchain proof URI");
  }
  submission = await submitProofOnArc({
    contestAddress: targetContest,
    contentHash: result.artifact.contentHash,
    metadataUri: artifactPublicUri(
      result.artifact.contentHash,
      process.env.AGENT_ARTIFACT_BASE_URL,
    ),
    privateKey: privateKey as Hex,
  });
  await appendEvidence({
    kind: "chain-transaction",
    mode: "real",
    payload: {
      ...submission,
      contractAddress: targetContest,
      contentHash: result.artifact.contentHash,
    },
  });
}

console.log(
  JSON.stringify(
    {
      contestMode: contest.mode,
      result,
      artifactStorage,
      submission,
      submissionStatus: submission ? "confirmed" : "not-submitted",
      evidenceSaved: true,
    },
    null,
    2,
  ),
);

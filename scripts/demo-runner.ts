import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { demoContest } from "../packages/shared/src/fixtures";
import { FixtureModelAdapter } from "../apps/agent/src/model-adapter";
import { runBuilderAgent } from "../apps/agent/src/runner";
import { FixtureX402Client } from "../apps/agent/src/x402-client";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const seed = JSON.parse(await readFile(join(workspaceRoot, ".demo/seed.json"), "utf8")) as {
  evidenceMode: "fixture";
  submissions: Array<{ slug: string; contentHash: string }>;
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
  x402: new FixtureX402Client(),
  knownContentHashes: [],
});

const expectedHash = seed.submissions.find(
  (submission) => submission.slug === "northstar",
)?.contentHash;
if (!result.artifact || result.artifact.contentHash !== expectedHash) {
  throw new Error("Seed hash does not match the prepared Northstar artifact");
}
if (!result.verification?.qualified) throw new Error("Prepared artifact failed hard verification");
if (result.analysis?.payment.paymentOccurred) throw new Error("Fixture runner recorded a payment");

console.log(
  JSON.stringify(
    {
      evidenceMode: seed.evidenceMode,
      decision: result.decision.decision,
      beforePaidAnalysis: {
        qualificationProbabilityBps: result.quotedDecision?.metrics.qualificationProbabilityBps,
        generationCostAtomic: result.quotedDecision?.metrics.estimatedGenerationCostAtomic,
        expectedValueAtomic: result.quotedDecision?.metrics.expectedValueAtomic,
      },
      afterPaidAnalysis: {
        qualificationProbabilityBps: result.decision.metrics.qualificationProbabilityBps,
        generationCostAtomic: result.decision.metrics.estimatedGenerationCostAtomic,
        expectedValueAtomic: result.decision.metrics.expectedValueAtomic,
      },
      probabilityAdjustments: result.probability?.adjustments,
      x402QuotedAmountAtomic: result.analysis?.payment.quotedAmountAtomic,
      x402PaymentOccurred: result.analysis?.payment.paymentOccurred,
      artifactHash: result.artifact.contentHash,
      qualified: result.verification.qualified,
      onchainSubmission: "not-attempted-without-credentials",
    },
    null,
    2,
  ),
);

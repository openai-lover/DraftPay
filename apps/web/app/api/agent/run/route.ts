import type { ModelAdapter, X402BriefClient } from "@draftpay/agent";
import {
  approvedContestMetadataSchema,
  createDemoContest,
  type ContestSummary,
} from "@draftpay/shared";
import { isAddress, isHex, type Hex } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let running = false;
const requestsByAddress = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  if (process.env.VERCEL === "1") {
    return Response.json(
      {
        error:
          "Hosted Builder Agent runs are disabled; use the dedicated low-balance local operator wallet",
      },
      { status: 503 },
    );
  }

  const caller = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const rate = requestsByAddress.get(caller);
  if (!rate || rate.resetAt <= now) {
    requestsByAddress.set(caller, { count: 1, resetAt: now + 60_000 });
  } else {
    rate.count += 1;
    if (rate.count > 5) {
      return Response.json({ error: "Agent run rate limit exceeded" }, { status: 429 });
    }
  }

  if (running) return Response.json({ error: "Builder Agent is already running" }, { status: 429 });
  running = true;
  try {
    const {
      CircleGatewayX402Client,
      FixtureX402Client,
      SpendingPolicy,
      createModelAdapter,
      appendEvidence,
      artifactPublicUri,
      listStoredArtifactHashes,
      runBuilderAgent,
      readContestOnArc,
      storeArtifact,
      submitProofOnArc,
    } = await import("@draftpay/agent");
    const realX402 = process.env.X402_MODE === "real";
    const privateKey = process.env.AGENT_PRIVATE_KEY;
    const targetContest = process.env.AGENT_SUBMIT_CONTEST_ADDRESS;
    if (realX402 || targetContest) {
      const runToken = process.env.AGENT_RUN_TOKEN;
      if (!runToken) {
        return Response.json(
          {
            error: "AGENT_RUN_TOKEN is required before enabling privileged web agent runs",
          },
          { status: 503 },
        );
      }
      if (request.headers.get("authorization") !== `Bearer ${runToken}`) {
        return Response.json(
          { error: "Enter the configured operator token to run the real Builder Agent" },
          { status: 401 },
        );
      }
    }
    if (realX402 && (!privateKey || !isHex(privateKey) || privateKey.length !== 66)) {
      return Response.json(
        { error: "A valid server-only AGENT_PRIVATE_KEY is required for real x402 mode" },
        { status: 503 },
      );
    }

    const policy = new SpendingPolicy({
      maxPaymentPerRequestAtomic: BigInt(process.env.X402_MAX_PAYMENT_ATOMIC ?? "50000"),
      maxSessionSpendAtomic: BigInt(process.env.X402_MAX_SESSION_SPEND_ATOMIC ?? "100000"),
      maxDailySpendAtomic: BigInt(process.env.X402_MAX_DAILY_SPEND_ATOMIC ?? "500000"),
      allowedOrigins: [process.env.X402_ALLOWED_ORIGIN ?? "http://localhost:3402"],
      emergencyDisabled: process.env.X402_EMERGENCY_DISABLED === "true",
    });
    const x402: X402BriefClient = realX402
      ? new CircleGatewayX402Client(
          process.env.X402_SERVICE_URL ?? "http://localhost:3402/x402/brief-analysis",
          policy,
          privateKey as Hex,
        )
      : new FixtureX402Client();
    const model: ModelAdapter = createModelAdapter();

    let contest: ContestSummary = { ...createDemoContest(), state: "submission-open" };
    if (targetContest) {
      if (!isAddress(targetContest)) {
        return Response.json({ error: "AGENT_SUBMIT_CONTEST_ADDRESS is invalid" }, { status: 503 });
      }
      const metadataJson = process.env.AGENT_CONTEST_METADATA_JSON;
      if (!metadataJson) {
        return Response.json(
          {
            error: "AGENT_CONTEST_METADATA_JSON is required so real contest inputs can be verified",
          },
          { status: 503 },
        );
      }
      const parsedMetadata = approvedContestMetadataSchema.parse(JSON.parse(metadataJson));
      contest = await readContestOnArc({
        contestAddress: targetContest,
        metadata: parsedMetadata,
      });
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
        maxPaymentPerRequestAtomic: process.env.X402_MAX_PAYMENT_ATOMIC ?? "50000",
        maxSessionSpendAtomic: process.env.X402_MAX_SESSION_SPEND_ATOMIC ?? "100000",
        spentThisSessionAtomic: "0",
        maxDailySpendAtomic: process.env.AGENT_MAX_DAILY_SPEND_ATOMIC ?? "5000000",
        spentTodayAtomic: "0",
        availableTools: ["static-page-generator", "deterministic-verifier", "x402-client"],
      },
      model,
      x402,
      knownContentHashes: targetContest ? await listStoredArtifactHashes() : [],
    });

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
      result.artifact &&
      result.verification?.qualified &&
      targetContest &&
      isAddress(targetContest) &&
      privateKey &&
      isHex(privateKey) &&
      privateKey.length === 66
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
    }

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
    if (submission && targetContest) {
      await appendEvidence({
        kind: "chain-transaction",
        mode: "real",
        payload: {
          ...submission,
          contractAddress: targetContest,
          contentHash: result.artifact?.contentHash,
        },
      });
    }

    const allEvidenceReal = Boolean(
      contest.mode === "real" &&
      result.analysis?.payment.mode === "real" &&
      result.analysis.payment.paymentOccurred &&
      result.artifact?.mode === "real" &&
      submission,
    );

    return Response.json({
      evidenceMode: allEvidenceReal ? "real" : "fixture",
      contestMode: contest.mode,
      result,
      artifactStorage,
      submission,
      submissionStatus: submission ? "confirmed" : "not-submitted",
      evidenceSaved: true,
    });
  } catch (cause) {
    return Response.json(
      { error: cause instanceof Error ? cause.message : "Builder Agent failed" },
      { status: 500 },
    );
  } finally {
    running = false;
  }
}

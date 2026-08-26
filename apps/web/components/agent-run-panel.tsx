"use client";

import { transactionExplorerUrl } from "@draftpay/chain";
import { formatUsdc } from "@draftpay/shared";
import { EvidenceBadge, StatusPill } from "@draftpay/ui";
import { LoaderCircle, Play } from "lucide-react";
import { useState } from "react";

interface AgentRunResponse {
  evidenceMode: "fixture" | "real";
  contestMode: "fixture" | "real";
  result: {
    decision: {
      decision: "participate" | "skip";
      reasons: string[];
      metrics: {
        supportedCategory: boolean;
        contestOpen: boolean;
        prizeAtomic: string;
        timeRemainingSeconds: number;
        qualificationProbabilityBps: number;
        expectedValueAtomic: string;
        estimatedGenerationCostAtomic: string;
        estimatedVerificationCostAtomic: string;
        estimatedX402CostAtomic: string;
        remainingDailyBudgetAtomic: string;
        requiredToolsAvailable: boolean;
      };
    };
    analysis: null | {
      payment: {
        mode: "fixture" | "real";
        paymentOccurred: boolean;
        amountAtomic: string;
        receiptId: string | null;
        status: "fixture" | "settled";
      };
    };
    artifact: null | { mode: "fixture" | "real"; contentHash: string; bytes: number };
    verification: null | { qualified: boolean; score: number };
  };
  artifactStorage: null | {
    contentHash: string;
    byteLength: number;
    screenshotStatus: "not-captured";
  };
  submission: null | { hash: string; blockNumber: string; status: "success" };
  submissionStatus: "confirmed" | "not-submitted";
}

function formatSignedUsdc(value: bigint): string {
  return value < 0n ? `-${formatUsdc(-value)}` : formatUsdc(value);
}

export function AgentRunPanel({ hosted = false }: { hosted?: boolean }) {
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [result, setResult] = useState<AgentRunResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [operatorToken, setOperatorToken] = useState("");

  async function runAgent() {
    setStatus("running");
    setError(null);
    try {
      const response = await fetch("/api/agent/run", {
        method: "POST",
        ...(operatorToken ? { headers: { authorization: `Bearer ${operatorToken}` } } : {}),
      });
      const payload = (await response.json()) as AgentRunResponse | { error?: string };
      if (!response.ok || !("result" in payload)) {
        throw new Error(
          "error" in payload && payload.error ? payload.error : `Agent returned ${response.status}`,
        );
      }
      setResult(payload);
      setStatus("complete");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agent run failed");
      setStatus("error");
    }
  }

  return (
    <aside className="side-panel">
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
      >
        <h2>Builder Agent</h2>
        {result && <EvidenceBadge mode={result.evidenceMode} />}
      </div>
      <p style={{ color: "var(--ink-soft)" }}>
        Trigger one bounded run. The server uses a dedicated signer only when real credentials are
        configured.
      </p>
      {!hosted && (
        <label style={{ display: "grid", gap: 6, marginBottom: 12 }}>
          <span style={{ color: "var(--ink-soft)", fontSize: 12 }}>
            Operator token (real mode only)
          </span>
          <input
            aria-label="Operator token"
            type="password"
            autoComplete="off"
            value={operatorToken}
            onChange={(event) => setOperatorToken(event.target.value)}
            placeholder="Leave blank for fixture mode"
          />
        </label>
      )}
      <button
        className="button button--wide"
        type="button"
        disabled={hosted || status === "running"}
        onClick={runAgent}
      >
        {status === "running" ? (
          <LoaderCircle size={16} className="animate-spin" />
        ) : (
          <Play size={15} />
        )}
        {hosted
          ? "Local runner only"
          : status === "running"
            ? "Evaluating contest…"
            : "Run Builder Agent"}
      </button>
      {hosted ? (
        <div className="notice notice--amber" style={{ marginTop: 16 }}>
          Hosted runs are intentionally disabled. Use the local operator command so no signing key
          is exposed to a public deployment.
        </div>
      ) : status === "idle" ? (
        <div className="notice notice--amber" style={{ marginTop: 16 }}>
          Default mode uses a prepared artifact and mock x402 adapter. It records no payment or
          chain submission.
        </div>
      ) : null}
      {error && (
        <div className="notice notice--error" role="alert" style={{ marginTop: 16 }}>
          {error}
        </div>
      )}
      {result && (
        <div style={{ marginTop: 20 }}>
          <div className="data-row">
            <span>Decision</span>
            <strong>
              <StatusPill
                tone={result.result.decision.decision === "participate" ? "teal" : "amber"}
              >
                {result.result.decision.decision}
              </StatusPill>
            </strong>
          </div>
          <div className="data-row">
            <span>Contest input</span>
            <strong>
              {result.contestMode === "real" ? "Verified from Arc" : "Prepared fixture"}
            </strong>
          </div>
          <div className="data-row">
            <span>Supported</span>
            <strong>{result.result.decision.metrics.supportedCategory ? "Yes" : "No"}</strong>
          </div>
          <div className="data-row">
            <span>Submission state</span>
            <strong>
              {result.result.decision.metrics.contestOpen ? "Accepting submissions" : "Closed"}
            </strong>
          </div>
          <div className="data-row">
            <span>Prize</span>
            <strong>{formatUsdc(BigInt(result.result.decision.metrics.prizeAtomic))} USDC</strong>
          </div>
          <div className="data-row">
            <span>Time remaining</span>
            <strong>
              {(result.result.decision.metrics.timeRemainingSeconds / 3_600).toFixed(1)} hours
            </strong>
          </div>
          <div className="data-row">
            <span>Generation / verification</span>
            <strong>
              {formatUsdc(
                BigInt(result.result.decision.metrics.estimatedGenerationCostAtomic) +
                  BigInt(result.result.decision.metrics.estimatedVerificationCostAtomic),
              )}{" "}
              USDC
            </strong>
          </div>
          <div className="data-row">
            <span>x402 cost</span>
            <strong>
              {formatUsdc(BigInt(result.result.decision.metrics.estimatedX402CostAtomic))} USDC
            </strong>
          </div>
          <div className="data-row">
            <span>Qualification probability</span>
            <strong>{result.result.decision.metrics.qualificationProbabilityBps / 100}%</strong>
          </div>
          <div className="data-row">
            <span>Expected value</span>
            <strong>
              {formatSignedUsdc(BigInt(result.result.decision.metrics.expectedValueAtomic))} USDC
            </strong>
          </div>
          <div className="data-row">
            <span>Daily wallet budget left</span>
            <strong>
              {formatUsdc(BigInt(result.result.decision.metrics.remainingDailyBudgetAtomic))} USDC
            </strong>
          </div>
          <div className="data-row">
            <span>Required tools</span>
            <strong>
              {result.result.decision.metrics.requiredToolsAvailable ? "Available" : "Missing"}
            </strong>
          </div>
          <div className="data-row">
            <span>x402 payment</span>
            <strong>
              {result.result.analysis?.payment.paymentOccurred
                ? `${formatUsdc(BigInt(result.result.analysis.payment.amountAtomic))} USDC settled`
                : "No payment (fixture)"}
            </strong>
          </div>
          {result.result.analysis?.payment.receiptId && (
            <p className="hash">{result.result.analysis.payment.receiptId}</p>
          )}
          <div className="data-row">
            <span>Artifact</span>
            <strong>
              {result.result.artifact
                ? `${result.result.artifact.mode} · ${result.result.artifact.bytes} bytes`
                : "Not produced"}
            </strong>
          </div>
          <div className="data-row">
            <span>Verification</span>
            <strong>
              {result.result.verification
                ? `${result.result.verification.score}% · ${result.result.verification.qualified ? "qualified" : "rejected"}`
                : "Not run"}
            </strong>
          </div>
          <div className="data-row">
            <span>Artifact evidence</span>
            <strong>
              {result.artifactStorage
                ? `Stored · screenshot ${result.artifactStorage.screenshotStatus}`
                : "Not stored"}
            </strong>
          </div>
          <div className="data-row">
            <span>Proof submission</span>
            <strong>
              {result.submission
                ? `Confirmed block ${result.submission.blockNumber}`
                : "Not submitted"}
            </strong>
          </div>
          {result.submission && (
            <a
              className="transaction-link"
              href={transactionExplorerUrl(result.submission.hash)}
              target="_blank"
              rel="noreferrer"
            >
              {result.submission.hash}
            </a>
          )}
          <ul className="check-list" style={{ marginTop: 16 }}>
            {result.result.decision.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          {result.result.artifact && <p className="hash">{result.result.artifact.contentHash}</p>}
          {!result.result.analysis?.payment.paymentOccurred && (
            <p className="notice notice--amber">
              The fixture x402 adapter returned deterministic analysis. It is not a USDC receipt.
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

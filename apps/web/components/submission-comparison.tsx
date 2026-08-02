"use client";

import { ARC_TESTNET_CHAIN_ID, draftPayContestAbi } from "@draftpay/chain";
import { demoSubmissions, type VerificationCheck } from "@draftpay/shared";
import { EvidenceBadge, StatusPill } from "@draftpay/ui";
import { CheckCircle2, ExternalLink, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { isAddress, type Address, type Hex } from "viem";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import evidence from "@/data/final-run.json";
import { shortAddress, usdc } from "@/lib/format";

interface ComparedSubmission {
  key: string;
  onchainId: bigint | null;
  mode: "fixture" | "real";
  builderName: string;
  builderKind: string;
  builderAddress: string;
  title: string;
  rationale: string;
  previewPath: string | null;
  screenshotPath: string | null;
  contentHash: string;
  rank: number;
  verificationScore: number | null;
  verificationChecks: VerificationCheck[];
  toolCostAtomic: string | null;
  deliveryMinutes: number | null;
}

function safePreviewUrl(metadataUri: string): string | null {
  try {
    const url = new URL(metadataUri, window.location.origin);
    if (url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost")) {
      return url.toString();
    }
  } catch {
    return null;
  }
  return null;
}

const fixtureSubmissions: ComparedSubmission[] = demoSubmissions.map((submission) => ({
  key: submission.id,
  onchainId: null,
  mode: submission.mode,
  builderName: submission.builderName,
  builderKind: submission.builderKind,
  builderAddress: submission.builderAddress,
  title: submission.title,
  rationale: submission.rationale,
  previewPath: submission.previewPath,
  screenshotPath: submission.screenshotPath,
  contentHash: submission.contentHash,
  rank: submission.rank,
  verificationScore: submission.verificationScore,
  verificationChecks: submission.verificationChecks,
  toolCostAtomic: submission.toolCostAtomic,
  deliveryMinutes: submission.deliveryMinutes,
}));

const recordedFinalists: ComparedSubmission[] = evidence.submissions.winner.map(
  (submission, index) => {
    const artifact = evidence.artifacts.find(
      (candidate) => candidate.contentHash.toLowerCase() === submission.contentHash.toLowerCase(),
    );
    const rank = index + 1;
    return {
      key: `recorded-${submission.hash}`,
      onchainId: BigInt(rank),
      mode: "real",
      builderName: rank === 1 ? "DraftPay Agent" : `Finalist 0${rank}`,
      builderKind: "onchain wallet",
      builderAddress: submission.builder,
      title: `Submission #${rank}`,
      rationale:
        "The submission, qualification, rank, content hash, and public artifact are indexed from the completed Arc run.",
      previewPath: artifact?.publicUrl ?? null,
      screenshotPath: null,
      contentHash: submission.contentHash,
      rank,
      verificationScore: null,
      verificationChecks: [
        {
          id: `recorded-qualified-${rank}`,
          label: "Qualified by the Arc evaluator",
          passed: true,
          detail: "Qualification transaction is linked in the public evidence packet",
          hardFailure: false,
        },
        {
          id: `recorded-finalist-${rank}`,
          label: `Ranked finalist #${rank}`,
          passed: true,
          detail: "Finalist ranking is recorded on Arc Testnet",
          hardFailure: false,
        },
        {
          id: `recorded-hash-${rank}`,
          label: "Artifact hash bound onchain",
          passed: true,
          detail: submission.contentHash,
          hardFailure: false,
        },
      ],
      toolCostAtomic: rank === 1 ? evidence.agent.x402Payment.amountAtomic : null,
      deliveryMinutes: null,
    };
  },
);

export function SubmissionComparison({
  contestAddress: evidenceAddress,
}: {
  contestAddress?: string;
}) {
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [loadStatus, setLoadStatus] = useState<"idle" | "loading" | "degraded">("idle");
  const [error, setError] = useState<string | null>(null);
  const [onchainSubmissions, setOnchainSubmissions] =
    useState<ComparedSubmission[]>(recordedFinalists);
  const router = useRouter();
  const account = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const configured = evidenceAddress ?? process.env.NEXT_PUBLIC_DEMO_CONTEST_ADDRESS;
  const contestAddress: Address | null = configured && isAddress(configured) ? configured : null;

  useEffect(() => {
    let active = true;
    async function loadFinalists() {
      if (!contestAddress || !publicClient) return;
      setLoadStatus("loading");
      setError(null);
      try {
        const [rankedIds, count] = await publicClient.readContract({
          address: contestAddress,
          abi: draftPayContestAbi,
          functionName: "getRankedFinalists",
        });
        const finalistIds = rankedIds.slice(0, Number(count)).filter((id) => id !== 0n);
        const submissions = await Promise.all(
          finalistIds.map(async (submissionId): Promise<ComparedSubmission> => {
            const submission = await publicClient.readContract({
              address: contestAddress,
              abi: draftPayContestAbi,
              functionName: "getSubmission",
              args: [submissionId],
            });
            const previewPath = safePreviewUrl(submission.metadataURI);
            return {
              key: submissionId.toString(),
              onchainId: submissionId,
              mode: "real",
              builderName: `Builder ${shortAddress(submission.builder, 5)}`,
              builderKind: "onchain wallet",
              builderAddress: submission.builder,
              title: `Submission #${submissionId}`,
              rationale: previewPath
                ? "Artifact URI and content hash were read directly from Arc."
                : "The onchain artifact URI is not an allowed HTTPS preview URL.",
              previewPath,
              screenshotPath: null,
              contentHash: submission.deliverableHash as Hex,
              rank: submission.rank,
              verificationScore: null,
              verificationChecks: [
                {
                  id: `qualified-${submissionId}`,
                  label: "Qualified by configured evaluator",
                  passed: submission.qualified,
                  detail: "Qualification read from the contest contract",
                  hardFailure: false,
                },
                {
                  id: `finalist-${submissionId}`,
                  label: `Ranked finalist #${submission.rank}`,
                  passed: submission.finalistEligible && submission.rank > 0,
                  detail: "Finalist eligibility and rank read from Arc",
                  hardFailure: false,
                },
                {
                  id: `hash-${submissionId}`,
                  label: "Artifact hash bound onchain",
                  passed: submission.deliverableHash !== `0x${"0".repeat(64)}`,
                  detail: submission.deliverableHash,
                  hardFailure: false,
                },
              ],
              toolCostAtomic: null,
              deliveryMinutes: null,
            };
          }),
        );
        if (active) {
          setOnchainSubmissions(submissions);
          setSelected(0);
          setLoadStatus("idle");
        }
      } catch {
        if (active) {
          setOnchainSubmissions(recordedFinalists);
          setError(
            "Live Arc refresh is temporarily unavailable. Showing the recorded finalist receipts from the completed run.",
          );
          setLoadStatus("degraded");
        }
      }
    }
    void loadFinalists();
    return () => {
      active = false;
    };
  }, [contestAddress, publicClient]);

  const submissions = useMemo(
    () => (contestAddress ? onchainSubmissions : fixtureSubmissions),
    [contestAddress, onchainSubmissions],
  );
  const selectedSubmission = submissions[selected] ?? null;

  async function selectWinner() {
    if (!contestAddress || !account.address || !publicClient || !selectedSubmission?.onchainId)
      return;
    setStatus("pending");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: contestAddress,
        abi: draftPayContestAbi,
        functionName: "selectWinner",
        args: [selectedSubmission.onchainId],
        account: account.address,
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("Winner settlement reverted");
      router.push(`/settlements/winner?tx=${hash}&contest=${contestAddress}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Winner selection failed";
      setError(
        /rejected|denied/i.test(message)
          ? "The transaction was rejected. No winner was recorded."
          : message,
      );
      setStatus("error");
    }
  }

  const writeEnabled = Boolean(
    contestAddress &&
    selectedSubmission?.onchainId &&
    account.isConnected &&
    chainId === ARC_TESTNET_CHAIN_ID,
  );

  return (
    <>
      <div className="compare-toolbar">
        <div>
          <p>
            <strong>
              {selectedSubmission ? `Selected: ${selectedSubmission.builderName}` : "No finalists"}
            </strong>
          </p>
          {selectedSubmission && (
            <p style={{ color: "var(--ink-soft)", fontSize: 12 }}>
              Rank {selectedSubmission.rank} ·{" "}
              {selectedSubmission.verificationScore === null
                ? "verified onchain finalist"
                : `${selectedSubmission.verificationScore}% fixture verification`}
            </p>
          )}
        </div>
        <button
          className="button"
          type="button"
          disabled={!writeEnabled || status === "pending"}
          onClick={selectWinner}
        >
          {(status === "pending" || loadStatus === "loading") && (
            <LoaderCircle size={16} className="animate-spin" />
          )}
          {contestAddress
            ? selectedSubmission
              ? `Select submission #${selectedSubmission.onchainId}`
              : "Waiting for ranked finalists"
            : "Select winner · real contract required"}
        </button>
      </div>
      {!contestAddress && (
        <p className="notice notice--amber">
          Comparison data is seeded. Configure a real evaluated contest address to load finalists
          and their artifact hashes directly from Arc.
        </p>
      )}
      {contestAddress && loadStatus === "loading" && (
        <p className="notice">Loading ranked finalists and submissions from Arc Testnet…</p>
      )}
      {contestAddress && loadStatus === "idle" && submissions.length === 0 && (
        <p className="notice notice--amber">
          This contest has no ranked finalists yet. Winner selection remains disabled.
        </p>
      )}
      {contestAddress && !account.isConnected && (
        <p className="notice">Connect the contest client wallet to select a winner.</p>
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <div className="compare-grid">
        {submissions.map((submission, index) => (
          <article
            className={`submission${selected === index ? " submission--selected" : ""}`}
            key={submission.key}
          >
            {submission.screenshotPath ? (
              <Image
                className="submission__image"
                src={submission.screenshotPath}
                alt={`${submission.title} landing-page screenshot`}
                width={1200}
                height={900}
                priority={index === 0}
              />
            ) : submission.previewPath ? (
              <iframe
                className="submission__image submission__preview"
                src={submission.previewPath}
                title={`${submission.title} sandboxed preview`}
                sandbox=""
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="submission__image submission__preview-placeholder">
                Preview unavailable
              </div>
            )}
            <div className="submission__body">
              <div className="submission__head">
                <div>
                  <EvidenceBadge mode={submission.mode} />
                  <h2>{submission.title}</h2>
                  <span>
                    {submission.builderName} · {submission.builderKind}
                  </span>
                </div>
                <StatusPill tone="teal">Qualified</StatusPill>
              </div>
              <p>{submission.rationale}</p>
              <div className="submission__metrics">
                <div className="submission__metric">
                  <span>Rank</span>
                  <strong>#{submission.rank}</strong>
                </div>
                <div className="submission__metric">
                  <span>{submission.toolCostAtomic ? "Tool cost" : "Evidence"}</span>
                  <strong>
                    {submission.toolCostAtomic ? usdc(submission.toolCostAtomic) : "Arc"}
                  </strong>
                </div>
                <div className="submission__metric">
                  <span>{submission.deliveryMinutes === null ? "Artifact" : "Delivered"}</span>
                  <strong>
                    {submission.deliveryMinutes === null
                      ? "Hash bound"
                      : `${submission.deliveryMinutes}m`}
                  </strong>
                </div>
              </div>
              <ul className="check-list">
                {submission.verificationChecks.slice(0, 4).map((check) => (
                  <li key={check.id}>
                    <CheckCircle2 size={13} color="var(--teal)" /> {check.label}
                  </li>
                ))}
              </ul>
              <div className="data-row">
                <span>Builder</span>
                <strong>{shortAddress(submission.builderAddress, 7)}</strong>
              </div>
              <p className="hash">{submission.contentHash}</p>
              <div className="submission__actions">
                <button
                  className={selected === index ? "button" : "button button--secondary"}
                  type="button"
                  onClick={() => setSelected(index)}
                >
                  {selected === index ? "Selected" : "Choose"}
                </button>
                {submission.previewPath ? (
                  <Link
                    className="button button--secondary"
                    href={submission.previewPath}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Preview <ExternalLink size={13} />
                  </Link>
                ) : (
                  <span className="button button--secondary" aria-disabled="true">
                    No preview
                  </span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

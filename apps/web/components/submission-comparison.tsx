"use client";

import { ARC_TESTNET_CHAIN_ID, draftPayContestAbi } from "@draftpay/chain";
import { demoSubmissions } from "@draftpay/shared";
import { EvidenceBadge, StatusPill } from "@draftpay/ui";
import { CheckCircle2, ExternalLink, LoaderCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isAddress, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWriteContract } from "wagmi";
import { shortAddress, usdc } from "@/lib/format";

export function SubmissionComparison() {
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const account = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const configured = process.env.NEXT_PUBLIC_DEMO_CONTEST_ADDRESS;
  const contestAddress: Address | null = configured && isAddress(configured) ? configured : null;
  const selectedSubmission = demoSubmissions[selected]!;

  async function selectWinner() {
    if (!contestAddress || !account.address || !publicClient) return;
    setStatus("pending");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: contestAddress,
        abi: draftPayContestAbi,
        functionName: "selectWinner",
        args: [BigInt(selected + 1)],
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
    contestAddress && account.isConnected && chainId === ARC_TESTNET_CHAIN_ID,
  );

  return (
    <>
      <div className="compare-toolbar">
        <div>
          <p>
            <strong>Selected: {selectedSubmission.builderName}</strong>
          </p>
          <p style={{ color: "var(--ink-soft)", fontSize: 12 }}>
            Rank {selectedSubmission.rank} · {selectedSubmission.verificationScore}% verification
          </p>
        </div>
        <button
          className="button"
          type="button"
          disabled={!writeEnabled || status === "pending"}
          onClick={selectWinner}
        >
          {status === "pending" && <LoaderCircle size={16} className="animate-spin" />}
          {contestAddress
            ? `Select ${selectedSubmission.builderName}`
            : "Select winner · real contract required"}
        </button>
      </div>
      {!contestAddress && (
        <p className="notice notice--amber">
          Comparison data is seeded. Configure a real evaluated contest address to enable the
          client-signed `selectWinner` transaction.
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
        {demoSubmissions.map((submission, index) => (
          <article
            className={`submission${selected === index ? " submission--selected" : ""}`}
            key={submission.id}
          >
            <Image
              className="submission__image"
              src={submission.screenshotPath}
              alt={`${submission.title} landing-page screenshot`}
              width={1200}
              height={900}
              priority={index === 0}
            />
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
                  <span>Checks</span>
                  <strong>{submission.verificationScore}%</strong>
                </div>
                <div className="submission__metric">
                  <span>Tool cost</span>
                  <strong>{usdc(submission.toolCostAtomic)}</strong>
                </div>
                <div className="submission__metric">
                  <span>Delivered</span>
                  <strong>{submission.deliveryMinutes}m</strong>
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
                <Link
                  className="button button--secondary"
                  href={submission.previewPath}
                  target="_blank"
                >
                  Preview <ExternalLink size={13} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

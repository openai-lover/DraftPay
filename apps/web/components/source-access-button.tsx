"use client";

import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import type { Address, Hash } from "viem";
import { useAccount, useSignMessage } from "wagmi";
import type { SourceChallenge } from "@/lib/source-access";

export function SourceAccessButton({
  transactionHash,
  contestAddress,
  winnerSubmissionId,
}: {
  transactionHash: Hash;
  contestAddress: Address;
  winnerSubmissionId: bigint;
}) {
  const account = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function downloadSource() {
    if (!account.address) return;
    setStatus("pending");
    setError(null);
    try {
      const challengeResponse = await fetch("/api/source/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          address: account.address,
          contest: contestAddress,
          transactionHash,
          submissionId: winnerSubmissionId.toString(),
        }),
      });
      const challenge = (await challengeResponse.json()) as Partial<SourceChallenge> & {
        message?: string;
        error?: string;
      };
      if (
        !challengeResponse.ok ||
        !challenge.address ||
        !challenge.contest ||
        !challenge.transactionHash ||
        !challenge.submissionId ||
        !challenge.nonce ||
        !challenge.issuedAt ||
        !challenge.expiresAt ||
        !challenge.message
      ) {
        throw new Error(challenge.error ?? "Could not create source-access challenge");
      }
      const signature = await signMessageAsync({ message: challenge.message });
      const downloadResponse = await fetch("/api/source/download", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challenge: {
            address: challenge.address,
            contest: challenge.contest,
            transactionHash: challenge.transactionHash,
            submissionId: challenge.submissionId,
            nonce: challenge.nonce,
            issuedAt: challenge.issuedAt,
            expiresAt: challenge.expiresAt,
          },
          signature,
        }),
      });
      if (!downloadResponse.ok) {
        const body = (await downloadResponse.json()) as { error?: string };
        throw new Error(body.error ?? "Source access denied");
      }
      const blobUrl = URL.createObjectURL(await downloadResponse.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `draftpay-submission-${winnerSubmissionId}-source.html`;
      link.click();
      URL.revokeObjectURL(blobUrl);
      setStatus("idle");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Source access failed";
      setError(/rejected|denied/i.test(message) ? "Wallet signature was rejected." : message);
      setStatus("error");
    }
  }

  return (
    <div style={{ marginTop: 18 }}>
      <button
        className="button"
        type="button"
        disabled={!account.address || status === "pending"}
        onClick={downloadSource}
      >
        {status === "pending" ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <Download size={15} />
        )}
        Sign to download winner source
      </button>
      <p className="form-help">
        The server verifies the client wallet, short-lived signed challenge, winner event, and
        settlement receipt before releasing the source package.
      </p>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

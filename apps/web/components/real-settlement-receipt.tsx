"use client";

import {
  addressExplorerUrl,
  contestStateLabels,
  draftPayContestAbi,
  transactionExplorerUrl,
} from "@draftpay/chain";
import { EvidenceBadge, StatusPill } from "@draftpay/ui";
import { Check, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { getAddress, parseEventLogs, type Address, type Hash } from "viem";
import { usePublicClient } from "wagmi";
import { SourceAccessButton } from "@/components/source-access-button";
import { usdc } from "@/lib/format";

interface VerifiedReceipt {
  blockNumber: string;
  state: number;
  timestamp: string;
  payouts: Array<{ recipient: Address; amount: bigint; submissionId: bigint }>;
  events: string[];
  winnerSubmissionId: bigint | null;
}

export function RealSettlementReceipt({
  transactionHash,
  contestAddress,
  expectedOutcome,
}: {
  transactionHash: Hash;
  contestAddress: Address;
  expectedOutcome: "winner" | "no-winner";
}) {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<"loading" | "verified" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<VerifiedReceipt | null>(null);

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!publicClient) return;
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: transactionHash });
        if (receipt.status !== "success") throw new Error("The transaction did not succeed");
        if (!receipt.to || getAddress(receipt.to) !== getAddress(contestAddress)) {
          throw new Error("The transaction did not target this DraftPay contest");
        }
        const [payouts, state, block] = await Promise.all([
          publicClient.readContract({
            address: contestAddress,
            abi: draftPayContestAbi,
            functionName: "getPayouts",
          }),
          publicClient.readContract({
            address: contestAddress,
            abi: draftPayContestAbi,
            functionName: "state",
          }),
          publicClient.getBlock({ blockNumber: receipt.blockNumber }),
        ]);
        const logs = parseEventLogs({ abi: draftPayContestAbi, logs: receipt.logs, strict: false });
        const eventNames = logs.map((log) => log.eventName);
        const expectedEvent = expectedOutcome === "winner" ? "WinnerSettled" : "NoWinnerSettled";
        const expectedState = expectedOutcome === "winner" ? 4 : 5;
        if (!eventNames.includes(expectedEvent)) {
          throw new Error(`Receipt does not contain the expected ${expectedEvent} event`);
        }
        if (Number(state) !== expectedState) {
          throw new Error("Contest final state does not match the requested receipt outcome");
        }
        const winnerSettlement = logs.find((log) => log.eventName === "WinnerSettled");
        if (active) {
          setVerified({
            blockNumber: receipt.blockNumber.toString(),
            state: Number(state),
            timestamp: new Date(Number(block.timestamp) * 1_000).toISOString(),
            payouts: payouts.map((payout) => ({
              recipient: payout.recipient,
              amount: payout.amount,
              submissionId: payout.submissionId,
            })),
            events: eventNames,
            winnerSubmissionId:
              winnerSettlement?.eventName === "WinnerSettled"
                ? (winnerSettlement.args.winnerSubmissionId ?? null)
                : null,
          });
          setStatus("verified");
        }
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Receipt verification failed");
          setStatus("error");
        }
      }
    }
    void verify();
    return () => {
      active = false;
    };
  }, [contestAddress, expectedOutcome, publicClient, transactionHash]);

  if (status === "loading")
    return <div className="receipt loading-shimmer" aria-label="Verifying Arc receipt" />;
  if (status === "error" || !verified)
    return (
      <div className="shell notice notice--error" style={{ marginBottom: 96 }}>
        Arc receipt could not be verified: {error}
      </div>
    );

  return (
    <article className="receipt">
      <div className="receipt__hero">
        <div className="receipt__mark">
          <Check size={22} />
        </div>
        <h2>Settlement confirmed</h2>
        <p>
          Receipt status, target contract, event logs, payouts, and final contract state were read
          directly from Arc Testnet.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <EvidenceBadge mode="real" />
          <StatusPill tone="teal">Block {verified.blockNumber}</StatusPill>
        </div>
      </div>
      <section className="receipt__section">
        <h2>Recipient ledger</h2>
        {verified.payouts.map((payout, index) => (
          <div className="payout-row" key={`${payout.recipient}-${index}`}>
            <div>
              <div className="payout-row__label">
                {payout.submissionId === 0n ? "Client refund" : `Submission ${payout.submissionId}`}
              </div>
              <div className="payout-row__address">{payout.recipient}</div>
            </div>
            <div className="payout-row__amount">{usdc(payout.amount)}</div>
          </div>
        ))}
      </section>
      <section className="receipt__section">
        <h2>Contract events</h2>
        <div className="event-list">
          {verified.events.map((event, index) => (
            <StatusPill key={`${event}-${index}`}>{event}</StatusPill>
          ))}
        </div>
      </section>
      <section className="receipt__section">
        <h2>Chain evidence</h2>
        <div className="data-row">
          <span>Final state</span>
          <strong>{contestStateLabels[verified.state] ?? verified.state}</strong>
        </div>
        <div className="data-row">
          <span>Settled at</span>
          <strong>{verified.timestamp}</strong>
        </div>
        <div className="data-row">
          <span>Transaction</span>
          <strong>{transactionHash}</strong>
        </div>
        <div className="data-row">
          <span>Contract</span>
          <strong>{contestAddress}</strong>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <a
            className="button"
            href={transactionExplorerUrl(transactionHash)}
            target="_blank"
            rel="noreferrer"
          >
            Transaction on ArcScan <ExternalLink size={14} />
          </a>
          <a
            className="button button--secondary"
            href={addressExplorerUrl(contestAddress)}
            target="_blank"
            rel="noreferrer"
          >
            Contract on ArcScan <ExternalLink size={14} />
          </a>
        </div>
        {expectedOutcome === "winner" && verified.winnerSubmissionId !== null && (
          <SourceAccessButton
            transactionHash={transactionHash}
            contestAddress={contestAddress}
            winnerSubmissionId={verified.winnerSubmissionId}
          />
        )}
      </section>
      <div className="receipt__foot">
        <span>Final and verified on Arc Testnet</span>
        <span>USDC ERC-20 interface · 6 decimals</span>
      </div>
    </article>
  );
}

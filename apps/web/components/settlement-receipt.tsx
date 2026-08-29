import type { SettlementSummary } from "@draftpay/shared";
import { EvidenceBadge, StatusPill } from "@draftpay/ui";
import { Check } from "lucide-react";
import { usdc } from "@/lib/format";

export function SettlementReceipt({ settlement }: { settlement: SettlementSummary }) {
  const isWinner = settlement.outcome === "winner";
  return (
    <article className="receipt">
      <div className="receipt__hero">
        <div className="receipt__mark">
          <Check size={22} />
        </div>
        <h2>{isWinner ? "Winner payout preview" : "Effort protected"}</h2>
        <p>
          {isWinner
            ? "95% to the selected result. The finalist pool recognizes other qualified work."
            : "The client receives 70%. Ranked qualified builders share the 30% Effort Protection Pool."}
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <EvidenceBadge mode={settlement.mode} />
          <StatusPill tone="teal">Rules balanced</StatusPill>
        </div>
      </div>
      <section className="receipt__section">
        <h2>Recipient ledger</h2>
        {settlement.payouts.map((payout) => (
          <div className="payout-row" key={`${payout.label}-${payout.recipient}`}>
            <div>
              <div className="payout-row__label">{payout.label}</div>
              <div className="payout-row__address">{payout.recipient}</div>
            </div>
            <div className="payout-row__amount">{usdc(payout.amountAtomic)}</div>
          </div>
        ))}
      </section>
      <section className="receipt__section">
        <h2>Contract event summary</h2>
        <div className="event-list">
          {settlement.events.map((event) => (
            <StatusPill key={event}>{event}</StatusPill>
          ))}
        </div>
      </section>
      <section className="receipt__section">
        <h2>Chain evidence</h2>
        {settlement.transactionHash && settlement.contractAddress ? (
          <>
            <div className="data-row">
              <span>Transaction</span>
              <strong>{settlement.transactionHash}</strong>
            </div>
            <div className="data-row">
              <span>Contract</span>
              <strong>{settlement.contractAddress}</strong>
            </div>
            <div className="data-row">
              <span>Block</span>
              <strong>{settlement.blockNumber}</strong>
            </div>
          </>
        ) : (
          <div className="notice notice--amber">
            Rule preview only. No transaction hash, deployed contract, block, timestamp, or ArcScan
            link is fabricated in fixture mode.
          </div>
        )}
      </section>
      <div className="receipt__foot">
        <span>Final state: {settlement.finalState}</span>
        <span>Arc Testnet · 6-decimal ERC-20 USDC</span>
      </div>
    </article>
  );
}

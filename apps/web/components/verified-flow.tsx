import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import evidenceJson from "@/data/final-run.json";
import { SectionLabel } from "@draftpay/ui";

interface TransactionEvidence {
  hash: string;
  explorerUrl: string;
}

interface SettlementEvidence {
  transactionHash: string;
  explorerUrl: string;
  payouts: PayoutEvidence[];
}

interface PayoutEvidence {
  recipient: string;
  amountUsdc: string;
  submissionId: string;
}

interface FinalEvidence {
  agent: {
    decision: string;
    providerLabel: string;
    x402Payment: {
      amountAtomic: string;
      receiptId: string;
      status: string;
    };
  };
  artifacts: Array<{
    contentHash: string;
    publicUrl: string;
    hardChecks: Array<{ passed: boolean }>;
  }>;
  submissions: { winner: TransactionEvidence[] };
  evaluations: { winner: TransactionEvidence[] };
  settlements: {
    winner: SettlementEvidence;
    noWinner: SettlementEvidence;
  };
  publicX402Url: string;
}

const evidence = evidenceJson as unknown as FinalEvidence;

function short(value: string, leading = 10, trailing = 8) {
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}

function money(atomic: string) {
  return `${(Number(atomic) / 1_000_000).toFixed(2)} USDC`;
}

export default function VerifiedFlow() {
  const artifact = evidence.artifacts[0]!;
  const submission = evidence.submissions.winner[0]!;
  const ranking = evidence.evaluations.winner.at(-1)!;
  const passedChecks = artifact.hardChecks.filter((check) => check.passed).length;
  const steps = [
    {
      label: "Agent decided",
      value: "PARTICIPATE",
      detail: evidence.agent.providerLabel,
      href: null,
    },
    {
      label: "x402 settled",
      value: money(evidence.agent.x402Payment.amountAtomic),
      detail: `Receipt ${short(evidence.agent.x402Payment.receiptId, 8, 6)}`,
      href: evidence.publicX402Url.replace("/x402/brief-analysis", "/health"),
    },
    {
      label: "Artifact verified",
      value: `${passedChecks}/${artifact.hardChecks.length} CHECKS`,
      detail: short(artifact.contentHash),
      href: artifact.publicUrl,
    },
    {
      label: "Proof submitted",
      value: "ARC CONFIRMED",
      detail: short(submission.hash),
      href: submission.explorerUrl,
    },
    {
      label: "Finalists ranked",
      value: "3 QUALIFIED",
      detail: short(ranking.hash),
      href: ranking.explorerUrl,
    },
    {
      label: "Winner paid",
      value: "5.00 USDC",
      detail: short(evidence.settlements.winner.transactionHash),
      href: evidence.settlements.winner.explorerUrl,
    },
  ];

  return (
    <section className="verified-flow-section" id="live-proof">
      <div className="shell verified-flow">
        <div className="content-intro verified-flow__intro">
          <SectionLabel>One verifiable execution</SectionLabel>
          <h2>
            Agent decision to USDC payout.
            <br />
            Every handoff has a receipt.
          </h2>
          <p>
            This is not seeded UI. The paid tool call, generated artifact, submission, evaluator
            writes, and both terminal payout branches are linked to their public evidence.
          </p>
        </div>

        <ol className="verified-flow__timeline">
          {steps.map((step, index) => (
            <li key={step.label}>
              <span className="verified-flow__index">0{index + 1}</span>
              <CheckCircle2 aria-hidden="true" size={19} />
              <div>
                <span>{step.label}</span>
                <strong>{step.value}</strong>
                <small>{step.detail}</small>
              </div>
              {step.href ? (
                <a
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${step.label} evidence`}
                >
                  <ExternalLink size={16} />
                </a>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="verified-outcomes">
          <article>
            <div className="verified-outcomes__head">
              <span>Outcome A</span>
              <strong>Winner selected</strong>
            </div>
            <div className="verified-outcomes__payouts">
              {evidence.settlements.winner.payouts.map((payout, index) => (
                <div key={`${payout.recipient}-${payout.submissionId}`}>
                  <span>{index === 0 ? "Selected winner" : `Finalist ${index + 1}`}</span>
                  <strong>{Number(payout.amountUsdc).toFixed(3)} USDC</strong>
                </div>
              ))}
            </div>
            <a href={evidence.settlements.winner.explorerUrl} target="_blank" rel="noreferrer">
              Inspect winner settlement <ArrowRight size={15} />
            </a>
          </article>

          <article className="verified-outcomes__no-winner">
            <div className="verified-outcomes__head">
              <span>Outcome B</span>
              <strong>No winner selected</strong>
            </div>
            <div className="verified-outcomes__payouts">
              {evidence.settlements.noWinner.payouts.map((payout, index) => (
                <div key={`${payout.recipient}-${payout.submissionId}`}>
                  <span>{payout.submissionId === "0" ? "Client refund" : `Rank ${index + 1}`}</span>
                  <strong>{Number(payout.amountUsdc).toFixed(2)} USDC</strong>
                </div>
              ))}
            </div>
            <a href={evidence.settlements.noWinner.explorerUrl} target="_blank" rel="noreferrer">
              Inspect 15 / 10 / 5 settlement <ArrowRight size={15} />
            </a>
          </article>
        </div>
      </div>
    </section>
  );
}

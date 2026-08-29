import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Code2,
  ExternalLink,
  GitBranch,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { SectionLabel, StatusPill } from "@draftpay/ui";
import { LiveNetworkProof } from "@/components/live-network-proof";
import {
  ARC_TESTNET_DOCS_URL,
  CIRCLE_X402_DOCS_URL,
  GITHUB_REPOSITORY_URL,
} from "@/lib/external-links";

export const metadata: Metadata = {
  title: "Proof room",
  description:
    "Inspect DraftPay's Arc contracts, Circle x402 integration, autonomous agent controls, and reproducible quality gates.",
};

const qualityGates = [
  { value: "28", label: "Solidity tests", detail: "fuzz, reentrancy, high-severity lint" },
  { value: "34", label: "Agent unit tests", detail: "decisions, budgets, artifacts" },
  { value: "6", label: "x402 integration tests", detail: "buyer, seller, policy boundary" },
  { value: "24", label: "Browser journeys", detail: "desktop and mobile" },
];

const truthLedger = [
  {
    capability: "Arc wallet, network switching, and Circle faucet",
    status: "Live",
    tone: "teal" as const,
    evidence: "A real wallet session can add/switch Arc Testnet and request Testnet USDC.",
  },
  {
    capability: "Arc RPC, USDC, and Circle Gateway contracts",
    status: "Live read",
    tone: "teal" as const,
    evidence: "Checked against current chain state in the live panel above.",
  },
  {
    capability: "DraftPay factory and contest writes",
    status: "Verified onchain",
    tone: "teal" as const,
    evidence:
      "Factory deployment, winner settlement, and no-winner settlement are linked to ArcScan.",
  },
  {
    capability: "Circle Gateway x402 settlement",
    status: "Settled",
    tone: "teal" as const,
    evidence:
      "A real 402 quote, signed authorization, paid analysis, and receipt are recorded in the public evidence bundle.",
  },
  {
    capability: "Marketplace contests and activity",
    status: "Mixed evidence",
    tone: "amber" as const,
    evidence:
      "Real settlement records are linked; illustrative marketplace rows remain visibly labeled as fixtures.",
  },
];

export default function ProofPage() {
  return (
    <>
      <section className="proof-hero">
        <div className="shell proof-hero__grid">
          <div>
            <SectionLabel>Judge verification room</SectionLabel>
            <h1>Audit the product, not the pitch.</h1>
            <p>
              Follow the money, inspect the decision boundary, and reproduce every quality gate.
              DraftPay keeps live evidence and deterministic demo evidence visibly separate.
            </p>
            <div className="hero__actions">
              <a className="button" href="/evidence/final-run.json" target="_blank">
                Open public evidence <ExternalLink size={15} />
              </a>
              <Link className="button" href="/contests/saas-launch-01/compare">
                Inspect the decision UI <ArrowRight size={16} />
              </Link>
              <a
                className="button button--secondary"
                href={GITHUB_REPOSITORY_URL}
                target="_blank"
                rel="noreferrer"
              >
                Review source <ExternalLink size={15} />
              </a>
            </div>
          </div>
          <div className="proof-hero__summary">
            <span>Evidence contract</span>
            <strong>Real means independently verifiable.</strong>
            <p>
              A Real badge requires a successful Arc receipt or settled Circle payment that a judge
              can independently inspect. Illustrative UI remains explicitly marked Fixture.
            </p>
            <div>
              <CheckCircle2 size={16} /> No fabricated hashes, addresses, or payment IDs
            </div>
          </div>
        </div>
      </section>

      <div className="shell">
        <LiveNetworkProof />
      </div>

      <section className="proof-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <SectionLabel>System depth</SectionLabel>
              <h2>Three systems, one accountable outcome.</h2>
            </div>
            <p>
              The web app is only the control surface. Settlement authority lives on Arc, payment
              negotiation uses Circle Gateway x402, and the agent records its economic decisions.
            </p>
          </div>

          <div className="proof-capabilities">
            <article>
              <div className="proof-icon">
                <LockKeyhole size={20} />
              </div>
              <span>01 · Arc settlement</span>
              <h3>Isolated contest escrow</h3>
              <p>
                Exact USDC balance-delta funding, deadline-gated state transitions, ranked
                finalists, permissionless expiry, and prize-conserving winner/no-winner payouts.
              </p>
              <ul>
                <li>
                  <ShieldCheck size={14} /> Reentrancy and fee-on-transfer defenses
                </li>
                <li>
                  <GitBranch size={14} /> Factory deploys one escrow per contest
                </li>
              </ul>
            </article>
            <article>
              <div className="proof-icon">
                <CircleDollarSign size={20} />
              </div>
              <span>02 · Circle Gateway</span>
              <h3>x402-paid intelligence</h3>
              <p>
                The agent requests a quote, enforces origin and spending policy, authorizes a
                Nanopayment in real mode, and re-decides after receiving paid analysis.
              </p>
              <ul>
                <li>
                  <ShieldCheck size={14} /> Request, session, and daily caps
                </li>
                <li>
                  <Activity size={14} /> 402 negotiation and settlement evidence
                </li>
              </ul>
            </article>
            <article>
              <div className="proof-icon">
                <Bot size={20} />
              </div>
              <span>03 · Builder agent</span>
              <h3>Autonomy with boundaries</h3>
              <p>
                Three-stage expected-value decisions can reject before purchase, reject after quote,
                or abandon when purchased analysis makes the economics unattractive.
              </p>
              <ul>
                <li>
                  <Code2 size={14} /> Content-addressed artifact and source proof
                </li>
                <li>
                  <ShieldCheck size={14} /> Deterministic hard verification gates
                </li>
              </ul>
            </article>
          </div>

          <div className="architecture-flow" aria-label="DraftPay architecture flow">
            <div>
              <small>Client</small>
              <strong>Brief + USDC</strong>
            </div>
            <span>→</span>
            <div className="architecture-flow__primary">
              <small>Arc Testnet</small>
              <strong>Factory + contest escrow</strong>
            </div>
            <span>↔</span>
            <div>
              <small>Builder agent</small>
              <strong>Decide + verify + submit</strong>
            </div>
            <span>↔</span>
            <div>
              <small>Circle Gateway</small>
              <strong>x402 analysis</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="quality-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <SectionLabel>Reproducible quality</SectionLabel>
              <h2>Claims backed by executable checks.</h2>
            </div>
            <a
              className="button button--quiet"
              href={`${GITHUB_REPOSITORY_URL}/actions/workflows/quality.yml`}
              target="_blank"
              rel="noreferrer"
            >
              Open CI runs <ExternalLink size={15} />
            </a>
          </div>
          <div className="quality-grid">
            {qualityGates.map((gate) => (
              <div className="quality-card" key={gate.label}>
                <strong>{gate.value}</strong>
                <span>{gate.label}</span>
                <small>{gate.detail}</small>
              </div>
            ))}
          </div>
          <div className="proof-command">
            <span>One-command application verification</span>
            <code>pnpm quality</code>
          </div>
        </div>
      </section>

      <section className="proof-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <SectionLabel>Truth ledger</SectionLabel>
              <h2>Exactly what is live—and what is not.</h2>
            </div>
            <p>
              Live transactions, contract addresses, payment receipts, and fixture-only content use
              separate labels and separate evidence paths.
            </p>
          </div>
          <div className="truth-ledger">
            {truthLedger.map((item) => (
              <div className="truth-ledger__row" key={item.capability}>
                <strong>{item.capability}</strong>
                <StatusPill tone={item.tone}>{item.status}</StatusPill>
                <p>{item.evidence}</p>
              </div>
            ))}
          </div>
          <div className="proof-links">
            <a href={ARC_TESTNET_DOCS_URL} target="_blank" rel="noreferrer">
              Arc network reference <ExternalLink size={13} />
            </a>
            <a href={CIRCLE_X402_DOCS_URL} target="_blank" rel="noreferrer">
              Circle x402 reference <ExternalLink size={13} />
            </a>
            <a
              href={`${GITHUB_REPOSITORY_URL}/blob/main/docs/VERIFICATION.md`}
              target="_blank"
              rel="noreferrer"
            >
              Full verification guide <ExternalLink size={13} />
            </a>
            <Link href="/settlements/winner">
              Winner settlement <ExternalLink size={13} />
            </Link>
            <Link href="/settlements/no-winner">
              No-winner settlement <ExternalLink size={13} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

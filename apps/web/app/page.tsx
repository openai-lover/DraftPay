import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { createDemoContests, createDemoMarketplaceActivity } from "@draftpay/shared";
import { EvidenceBadge, SectionLabel, StatusPill } from "@draftpay/ui";
import { MarketplaceActivity } from "@/components/marketplace-activity";
import { usdc } from "@/lib/format";

const steps = ["Brief", "Build", "Verify", "Select", "Settle"];

export const dynamic = "force-dynamic";

export default function HomePage() {
  const contests = createDemoContests();
  const activity = createDemoMarketplaceActivity().slice(0, 4);
  const activeContests = contests.filter((contest) =>
    ["submission-open", "evaluation", "awaiting-selection"].includes(contest.state),
  ).length;
  const builderEntries = contests.reduce((total, contest) => total + contest.submissionCount, 0);
  const demoPrizeVolume = contests.reduce(
    (total, contest) => total + BigInt(contest.prizeAtomic),
    0n,
  );

  return (
    <>
      <section className="hero">
        <div className="shell hero__grid">
          <div>
            <p className="eyebrow">Build contests settled on Arc</p>
            <h1>Post a brief. Agents build. Programmable money pays fairly.</h1>
            <p className="hero__copy">
              Run outcome-based build contests where humans and autonomous agents submit working
              products and settle instantly in USDC.
            </p>
            <div className="hero__actions">
              <Link className="button" href="/contests/new">
                Post a contest <ArrowRight size={16} />
              </Link>
              <Link className="button button--secondary" href="/contests/saas-launch-01">
                Watch the live flow
              </Link>
            </div>
            <div className="hero__proof" aria-label="Product proof points">
              <span>
                <strong>Exact USDC escrow</strong> on Arc Testnet
              </span>
              <span>
                <strong>Bounded settlement</strong> to three finalists
              </span>
              <span>
                <strong>Visible economics</strong> for every agent decision
              </span>
            </div>
          </div>
          <div className="settlement-visual" aria-label="Winner settlement rule preview">
            <div className="settlement-visual__head">
              <strong>Settlement rule</strong>
              <StatusPill tone="teal">Contract enforced</StatusPill>
            </div>
            <div className="settlement-visual__amount">
              <span>Prize locked</span>
              <strong>
                100.00 <small>USDC</small>
              </strong>
            </div>
            <div className="settlement-rule">
              <div>
                <strong>Selected winner</strong>
                <small>Qualified submission</small>
              </div>
              <strong>95.00</strong>
            </div>
            <div className="settlement-rule">
              <div>
                <strong>Finalist 01</strong>
                <small>Effort recognized</small>
              </div>
              <strong>2.50</strong>
            </div>
            <div className="settlement-rule">
              <div>
                <strong>Finalist 02</strong>
                <small>Effort recognized</small>
              </div>
              <strong>2.50</strong>
            </div>
            <div className="settlement-visual__foot">
              <Check size={14} /> Payout total conserves the original 100 USDC prize
            </div>
          </div>
        </div>
      </section>

      <section className="market-pulse-section">
        <div className="shell">
          <div className="market-pulse__head">
            <div>
              <SectionLabel>Demo market pulse</SectionLabel>
              <h2>A marketplace that already has a rhythm.</h2>
            </div>
            <div className="market-pulse__actions">
              <EvidenceBadge mode="fixture" />
              <Link className="button button--quiet" href="/contests">
                Explore every contest <ArrowRight size={15} />
              </Link>
            </div>
          </div>
          <div className="market-stats" aria-label="Demo marketplace totals">
            <div className="market-stat">
              <strong>{activeContests}</strong>
              <span>Active demo contests</span>
            </div>
            <div className="market-stat">
              <strong>{builderEntries}</strong>
              <span>Seeded builder entries</span>
            </div>
            <div className="market-stat">
              <strong>{usdc(demoPrizeVolume)}</strong>
              <span>Visible demo prize rules</span>
            </div>
          </div>
          <MarketplaceActivity items={activity} compact label="Latest demo marketplace activity" />
          <p className="market-pulse__disclosure">
            Seeded demo data · no wallet payment, contract deployment, or transaction receipt is
            implied.
          </p>
        </div>
      </section>

      <section className="workflow" id="workflow">
        <div className="shell">
          <SectionLabel>One accountable flow</SectionLabel>
          <div className="workflow__rail">
            {steps.map((step, index) => (
              <div className="workflow__step" key={step}>
                <span>0{index + 1}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="editorial-section">
        <div className="shell section-head">
          <div>
            <SectionLabel>Why programmable money</SectionLabel>
            <h2>Good work should not become worthless because no winner was chosen.</h2>
          </div>
          <div>
            <p>
              DraftPay gives the client a clear outcome while preserving a fixed Effort Protection
              Pool for ranked, verified work. The contract—not a marketplace operator—executes the
              rule.
            </p>
            <Link className="button button--quiet" href="/settlements/no-winner">
              See the 70 / 15 / 10 / 5 receipt <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

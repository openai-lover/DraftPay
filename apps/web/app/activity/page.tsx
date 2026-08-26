import { createDemoMarketplaceActivity, demoActivity } from "@draftpay/shared";
import { EvidenceBadge, SectionLabel } from "@draftpay/ui";
import { AgentRunPanel } from "@/components/agent-run-panel";
import { MarketplaceActivity } from "@/components/marketplace-activity";

export const metadata = { title: "Agent activity" };
export const dynamic = "force-dynamic";

export default function ActivityPage() {
  const marketplaceActivity = createDemoMarketplaceActivity();

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Autonomous economics</SectionLabel>
        <h1>Every decision has an input you can inspect.</h1>
        <div className="page-header__meta">
          <span>
            No hidden chain-of-thought. Only measurable facts, concise reasons, and verifiable
            actions.
          </span>
        </div>
      </header>
      <section className="activity-stream-section" aria-labelledby="marketplace-activity-heading">
        <div className="activity-stream-section__head">
          <div>
            <SectionLabel>Recent marketplace activity</SectionLabel>
            <h2 id="marketplace-activity-heading">
              Briefs, builds, checks, and disciplined exits.
            </h2>
          </div>
          <EvidenceBadge mode="fixture" />
        </div>
        <MarketplaceActivity items={marketplaceActivity} />
        <p className="market-pulse__disclosure">
          Fixture events are illustrative and create no payment or onchain evidence.
        </p>
      </section>
      <div className="activity-run-heading">
        <div>
          <SectionLabel>Inspect one fixture agent run</SectionLabel>
          <h2>Northstar Agent evaluates the Ledgerly brief.</h2>
        </div>
      </div>
      <div className="activity-layout">
        <section className="timeline" aria-label="Builder Agent activity">
          {demoActivity.map((item) => (
            <div className={`timeline-item timeline-item--${item.status}`} key={item.id}>
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
              {item.value && <span className="timeline-value">{item.value}</span>}
            </div>
          ))}
        </section>
        <AgentRunPanel hosted={process.env.VERCEL === "1"} />
      </div>
    </div>
  );
}

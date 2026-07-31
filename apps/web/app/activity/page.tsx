import { demoActivity } from "@draftpay/shared";
import { EvidenceBadge, SectionLabel } from "@draftpay/ui";
import { AgentRunPanel } from "@/components/agent-run-panel";

export const metadata = { title: "Agent activity" };

export default function ActivityPage() {
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
      <div className="activity-layout">
        <section className="timeline" aria-label="Builder Agent activity">
          <div style={{ marginBottom: 20 }}>
            <EvidenceBadge mode="fixture" />
          </div>
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
        <AgentRunPanel />
      </div>
    </div>
  );
}

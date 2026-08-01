import { createDemoAgent } from "@draftpay/shared";
import { DataRow, EvidenceBadge, SectionLabel, StatusPill } from "@draftpay/ui";
import { shortAddress, usdc } from "@/lib/format";

export const metadata = { title: "Northstar Agent" };
export const dynamic = "force-dynamic";

export default function AgentProfilePage() {
  const demoAgent = createDemoAgent();

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Builder identity</SectionLabel>
        <h1>Economic history, not a chatbot bio.</h1>
      </header>
      <div className="profile-grid">
        <section className="profile-identity">
          <div className="profile-monogram">NA</div>
          <h1>{demoAgent.name}</h1>
          <p>{demoAgent.supportedSkill}</p>
          <EvidenceBadge mode={demoAgent.mode} />
          <div style={{ marginTop: 28 }}>
            <DataRow label="Wallet">{shortAddress(demoAgent.address, 7)}</DataRow>
            <DataRow label="Network">Arc Testnet</DataRow>
            <DataRow label="Agent identity">Local fixture profile</DataRow>
          </div>
          <p className="notice notice--amber" style={{ marginTop: 24 }}>
            Onchain agent identity is deliberately deferred until after the primary Arc escrow and
            x402 flows are deployed and evidenced.
          </p>
        </section>
        <section>
          <div className="profile-stats">
            <div className="profile-stat">
              <strong>{demoAgent.jobsEntered}</strong>
              <span>Jobs entered</span>
            </div>
            <div className="profile-stat">
              <strong>{demoAgent.qualificationRate}%</strong>
              <span>Qualification rate</span>
            </div>
            <div className="profile-stat">
              <strong>{usdc(demoAgent.earnedAtomic)}</strong>
              <span>Fixture economic history</span>
            </div>
          </div>
          <div style={{ marginTop: 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2>Validation history</h2>
              <StatusPill tone="amber">Fixture history</StatusPill>
            </div>
            {demoAgent.reputationHistory.map((item) => (
              <div className="history-row" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>{item.date}</div>
                </div>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

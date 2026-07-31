import { ArrowRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { createDemoContest } from "@draftpay/shared";
import { DataRow, EvidenceBadge, SectionLabel, StatusPill } from "@draftpay/ui";
import { displayDate, usdc } from "@/lib/format";
import { OnchainContestPanel } from "@/components/onchain-contest-panel";
import { NoWinnerControl } from "@/components/no-winner-control";

export const metadata = { title: "SaaS launch contest" };
export const dynamic = "force-dynamic";

export default function ContestDetailPage() {
  const demoContest = createDemoContest();

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Contest · Landing page</SectionLabel>
        <h1>{demoContest.title}</h1>
        <div className="page-header__meta">
          <EvidenceBadge mode={demoContest.mode} />
          <StatusPill tone="blue">Awaiting selection</StatusPill>
          <span>Three qualified results ready to compare</span>
        </div>
      </header>
      <div className="detail-grid">
        <section>
          <div className="detail-prize">
            <span>Escrowed prize rule</span>
            <strong>{usdc(demoContest.prizeAtomic)}</strong>
          </div>
          <p className="detail-copy">{demoContest.brief}</p>
          <h2 style={{ marginTop: 48 }}>Approved requirements</h2>
          <ul className="requirements">
            {demoContest.requirements.map((requirement) => (
              <li key={requirement.id}>{requirement.label}</li>
            ))}
          </ul>
          <div style={{ marginTop: 44 }}>
            <h2>Settlement rules</h2>
            <div className="data-row">
              <span>Winner selected</span>
              <strong>95% winner · 5% finalists</strong>
            </div>
            <div className="data-row">
              <span>No winner</span>
              <strong>70% refund · 15 / 10 / 5% ranked effort</strong>
            </div>
            <div className="data-row">
              <span>No qualified work</span>
              <strong>100% client refund</strong>
            </div>
          </div>
        </section>
        <aside>
          <div className="side-panel">
            <h2>Contest status</h2>
            <DataRow label="Escrow">Fixture rule preview</DataRow>
            <DataRow label="Submissions">{demoContest.qualifiedCount} qualified</DataRow>
            <DataRow label="Submission deadline">
              {displayDate(demoContest.submissionDeadline)}
            </DataRow>
            <DataRow label="Selection deadline">
              {displayDate(demoContest.selectionDeadline)}
            </DataRow>
            <DataRow label="Contract">Not deployed in fixture mode</DataRow>
            <div className="side-panel__actions">
              <Link className="button button--wide" href={`/contests/${demoContest.id}/compare`}>
                Compare submissions <ArrowRight size={16} />
              </Link>
              <Link className="button button--secondary button--wide" href="/activity">
                View agent activity
              </Link>
              <a
                className="button button--quiet button--wide"
                href="https://testnet.arcscan.app"
                target="_blank"
                rel="noreferrer"
              >
                Open ArcScan <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <OnchainContestPanel />
          <NoWinnerControl />
        </aside>
      </div>
    </div>
  );
}

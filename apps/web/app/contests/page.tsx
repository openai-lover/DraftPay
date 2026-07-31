import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { createDemoContest } from "@draftpay/shared";
import { EvidenceBadge, SectionLabel, StatusPill } from "@draftpay/ui";
import { displayDate, usdc } from "@/lib/format";

export const metadata = { title: "Explore contests" };
export const dynamic = "force-dynamic";

export default function ContestsPage() {
  const demoContest = createDemoContest();

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Open build contests</SectionLabel>
        <h1>Working products, not proposals.</h1>
        <div className="page-header__meta">
          <StatusPill tone="blue">Responsive landing pages</StatusPill>
          <span>One focused category for a reliable demo</span>
        </div>
      </header>
      <section aria-label="Contest list">
        <div className="contest-row">
          <div>
            <EvidenceBadge mode={demoContest.mode} />
            <h2>{demoContest.title}</h2>
            <p>{demoContest.brief.slice(0, 116)}…</p>
          </div>
          <div>
            <span className="metric-label">Prize</span>
            <span className="metric-value">{usdc(demoContest.prizeAtomic)}</span>
          </div>
          <div>
            <span className="metric-label">Qualified</span>
            <span className="metric-value">{demoContest.qualifiedCount} / 3</span>
          </div>
          <div>
            <span className="metric-label">Select by</span>
            <small>{displayDate(demoContest.selectionDeadline)}</small>
          </div>
          <Link
            className="button button--secondary"
            href={`/contests/${demoContest.id}`}
            aria-label={`Open ${demoContest.title}`}
          >
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
      <div style={{ padding: "48px 0 96px" }}>
        <div className="notice notice--amber">
          This list is seeded demonstration data. A configured factory address enables real contest
          creation; fixture rows never claim a contract or transaction.
        </div>
      </div>
    </div>
  );
}

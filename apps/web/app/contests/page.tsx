import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { createDemoContests, type ContestLifecycleState } from "@draftpay/shared";
import { EvidenceBadge, SectionLabel, StatusPill } from "@draftpay/ui";
import { relativeTime, usdc } from "@/lib/format";

export const metadata = { title: "Explore contests" };
export const dynamic = "force-dynamic";

function statePresentation(state: ContestLifecycleState): {
  label: string;
  tone: "blue" | "amber" | "teal" | "neutral";
} {
  switch (state) {
    case "submission-open":
      return { label: "Accepting builds", tone: "teal" };
    case "evaluation":
      return { label: "In verification", tone: "amber" };
    case "awaiting-selection":
      return { label: "Ready to select", tone: "blue" };
    case "settled-with-winner":
      return { label: "Winner preview", tone: "neutral" };
    default:
      return { label: state.replaceAll("-", " "), tone: "neutral" };
  }
}

export default function ContestsPage() {
  const contests = createDemoContests();

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Open build contests</SectionLabel>
        <h1>Working products, not proposals.</h1>
        <div className="page-header__meta">
          <StatusPill tone="blue">Responsive landing pages</StatusPill>
          <EvidenceBadge mode="fixture" />
          <span>One focused category with clear settlement rules</span>
        </div>
      </header>
      <section aria-label="Contest list">
        {contests.map((contest) => {
          const presentation = statePresentation(contest.state);

          return (
            <div className="contest-row" key={contest.id}>
              <div>
                <div className="contest-row__meta">
                  <span>
                    {contest.clientName} · updated {relativeTime(contest.updatedAt)}
                  </span>
                </div>
                <h2>{contest.title}</h2>
                <p>{contest.activityLabel}</p>
              </div>
              <div>
                <span className="metric-label">Prize rule</span>
                <span className="metric-value">{usdc(contest.prizeAtomic)}</span>
              </div>
              <div>
                <span className="metric-label">Builder activity</span>
                <span className="metric-value">{contest.submissionCount} entries</span>
                <small>{contest.qualifiedCount} qualified</small>
              </div>
              <div>
                <span className="metric-label">State</span>
                <StatusPill tone={presentation.tone}>{presentation.label}</StatusPill>
              </div>
              <Link
                className="button button--secondary"
                href={`/contests/${contest.id}`}
                aria-label={`Open ${contest.title}`}
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
          );
        })}
      </section>
      <div style={{ padding: "48px 0 96px" }}>
        <div className="notice notice--amber">
          Illustrative fixture data. These rows never claim a contract, payment, or transaction.
        </div>
      </div>
    </div>
  );
}

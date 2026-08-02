import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDemoContest, type ContestLifecycleState } from "@draftpay/shared";
import { DataRow, EvidenceBadge, SectionLabel, StatusPill } from "@draftpay/ui";
import { displayDate, relativeTime, usdc } from "@/lib/format";
import { OnchainContestPanel } from "@/components/onchain-contest-panel";
import { NoWinnerControl } from "@/components/no-winner-control";

export const dynamic = "force-dynamic";

interface ContestDetailPageProps {
  params: Promise<{ id: string }>;
}

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
      return { label: "Awaiting selection", tone: "blue" };
    case "settled-with-winner":
      return { label: "Winner preview", tone: "neutral" };
    default:
      return { label: state.replaceAll("-", " "), tone: "neutral" };
  }
}

export async function generateMetadata({ params }: ContestDetailPageProps) {
  const { id } = await params;
  const contest = getDemoContest(id);

  return { title: contest?.title ?? "Contest not found" };
}

export default async function ContestDetailPage({ params }: ContestDetailPageProps) {
  const { id } = await params;
  const demoContest = getDemoContest(id);
  if (!demoContest) notFound();

  const presentation = statePresentation(demoContest.state);
  const isFlagship = demoContest.id === "saas-launch-01";
  const isSettled = demoContest.state === "settled-with-winner";
  const primaryHref = isFlagship
    ? `/contests/${demoContest.id}/compare`
    : isSettled
      ? "/settlements/winner"
      : "/activity";
  const primaryLabel = isFlagship
    ? "Compare submissions"
    : isSettled
      ? "View settlement preview"
      : "Inspect marketplace activity";

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Contest · Landing page</SectionLabel>
        <h1>{demoContest.title}</h1>
        <div className="page-header__meta">
          <EvidenceBadge mode={demoContest.mode} />
          <StatusPill tone={presentation.tone}>{presentation.label}</StatusPill>
          <span>
            {demoContest.clientName} · {demoContest.activityLabel} · updated{" "}
            {relativeTime(demoContest.updatedAt)}
          </span>
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
            <DataRow label="Client">{demoContest.clientName}</DataRow>
            <DataRow label="Escrow">Fixture rule preview</DataRow>
            <DataRow label="Submissions">
              {demoContest.submissionCount} entered · {demoContest.qualifiedCount} qualified
            </DataRow>
            <DataRow label="Submission deadline">
              {displayDate(demoContest.submissionDeadline)}
            </DataRow>
            <DataRow label="Selection deadline">
              {displayDate(demoContest.selectionDeadline)}
            </DataRow>
            <DataRow label="Contract">Not deployed in fixture mode</DataRow>
            <div className="side-panel__actions">
              <Link className="button button--wide" href={primaryHref}>
                {primaryLabel} <ArrowRight size={16} />
              </Link>
              <Link className="button button--secondary button--wide" href="/activity">
                View agent activity
              </Link>
            </div>
          </div>
          {isFlagship ? (
            <>
              <OnchainContestPanel />
              <NoWinnerControl />
            </>
          ) : (
            <div className="notice notice--amber" style={{ marginTop: 18 }}>
              Fixture scenario. No wallet payment, deployed contract, or onchain receipt exists
              for this seeded contest.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

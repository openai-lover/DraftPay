import { SectionLabel } from "@draftpay/ui";
import { SubmissionComparison } from "@/components/submission-comparison";
import evidence from "@/data/final-run.json";

export const metadata = { title: "Compare submissions" };

export default function ComparePage() {
  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Qualified work · 3 finalists</SectionLabel>
        <h1>Compare the product, not the pitch.</h1>
        <div className="page-header__meta">
          <span>
            Every submission passed the same deterministic hard requirements. The client makes the
            final choice.
          </span>
        </div>
      </header>
      <SubmissionComparison contestAddress={evidence.contests.winner.address} />
    </div>
  );
}

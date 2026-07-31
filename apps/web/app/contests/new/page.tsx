import { SectionLabel } from "@draftpay/ui";
import { CreateContestForm } from "@/components/create-contest-form";

export const metadata = { title: "Post a contest" };

export default function CreateContestPage() {
  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>New build contest</SectionLabel>
        <h1>Turn the brief into rules before money moves.</h1>
        <div className="page-header__meta">
          <span>
            The Specification Agent creates a reviewable checklist. Your wallet funds only after
            approval.
          </span>
        </div>
      </header>
      <CreateContestForm />
    </div>
  );
}

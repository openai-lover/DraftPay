import { SectionLabel } from "@draftpay/ui";
import { ContestLifecycleLab } from "@/components/contest-lifecycle-lab";

export const metadata = { title: "Lifecycle lab" };

interface LifecycleLabPageProps {
  searchParams: Promise<{ contest?: string | string[]; tx?: string | string[] }>;
}

export default async function LifecycleLabPage({ searchParams }: LifecycleLabPageProps) {
  const params = await searchParams;
  const contest = Array.isArray(params.contest) ? params.contest[0] : params.contest;
  const creationTx = Array.isArray(params.tx) ? params.tx[0] : params.tx;

  return (
    <div className="shell">
      <header className="page-header">
        <SectionLabel>Arc Testnet · lifecycle lab</SectionLabel>
        <h1>Exercise every state transition with evidence.</h1>
        <div className="page-header__meta">
          <span>
            Submit a real artifact, evaluate it, rank finalists, and settle the exact contest you
            created. Every write still requires an explicit wallet signature.
          </span>
        </div>
      </header>
      <ContestLifecycleLab initialContest={contest ?? ""} initialCreationTx={creationTx ?? ""} />
    </div>
  );
}

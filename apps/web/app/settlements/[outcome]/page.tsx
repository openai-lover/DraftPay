import { noWinnerSettlementPreview, winnerSettlementPreview } from "@draftpay/shared";
import { SectionLabel } from "@draftpay/ui";
import { notFound } from "next/navigation";
import { isAddress, isHash, type Address, type Hash } from "viem";
import { RealSettlementReceipt } from "@/components/real-settlement-receipt";
import { SettlementReceipt } from "@/components/settlement-receipt";

export const metadata = { title: "Settlement receipt" };

export default async function SettlementPage({
  params,
  searchParams,
}: {
  params: Promise<{ outcome: string }>;
  searchParams: Promise<{ tx?: string; contest?: string }>;
}) {
  const [{ outcome }, query] = await Promise.all([params, searchParams]);
  if (outcome !== "winner" && outcome !== "no-winner") notFound();
  const preview = outcome === "no-winner" ? noWinnerSettlementPreview : winnerSettlementPreview;
  const hasValidEvidence = Boolean(
    query.tx && query.contest && isHash(query.tx) && isAddress(query.contest),
  );
  return (
    <div className="shell">
      <header className="page-header" style={{ textAlign: "center" }}>
        <SectionLabel>Programmable settlement</SectionLabel>
        <h1 style={{ marginInline: "auto" }}>
          {outcome === "no-winner"
            ? "Qualified effort still has value."
            : "The result is final. The payout is legible."}
        </h1>
      </header>
      {hasValidEvidence ? (
        <RealSettlementReceipt
          transactionHash={query.tx as Hash}
          contestAddress={query.contest as Address}
          expectedOutcome={outcome === "no-winner" ? "no-winner" : "winner"}
        />
      ) : (
        <SettlementReceipt settlement={preview} />
      )}
    </div>
  );
}

"use client";

import { addressExplorerUrl, contestStateLabels, draftPayContestAbi } from "@draftpay/chain";
import { DataRow, EvidenceBadge } from "@draftpay/ui";
import { isAddress, type Address } from "viem";
import { useReadContracts } from "wagmi";
import { shortAddress, usdc } from "@/lib/format";

function LiveContest({ address }: { address: Address }) {
  const contract = { address, abi: draftPayContestAbi } as const;
  const query = useReadContracts({
    contracts: [
      { ...contract, functionName: "state" },
      { ...contract, functionName: "prizeAmount" },
      { ...contract, functionName: "qualifiedCount" },
      { ...contract, functionName: "submissionDeadline" },
      { ...contract, functionName: "selectionDeadline" },
    ],
  });

  if (query.isPending)
    return <div className="side-panel loading-shimmer" aria-label="Loading onchain state" />;
  if (query.isError || !query.data) {
    return (
      <div className="notice notice--error" style={{ marginTop: 16 }}>
        Configured contract could not be read from Arc Testnet.
      </div>
    );
  }

  const state = Number(query.data[0]?.result ?? 0);
  const prize = BigInt(query.data[1]?.result ?? 0n);
  const qualified = Number(query.data[2]?.result ?? 0);
  const submissionDeadline = Number(query.data[3]?.result ?? 0n);
  const selectionDeadline = Number(query.data[4]?.result ?? 0n);

  return (
    <div className="side-panel" style={{ marginTop: 16 }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}
      >
        <h2>Live Arc state</h2>
        <EvidenceBadge mode="real" />
      </div>
      <DataRow label="Contract">{shortAddress(address, 7)}</DataRow>
      <DataRow label="State">{contestStateLabels[state] ?? `Unknown (${state})`}</DataRow>
      <DataRow label="Prize">{usdc(prize)}</DataRow>
      <DataRow label="Qualified">{qualified}</DataRow>
      <DataRow label="Submit by">{new Date(submissionDeadline * 1_000).toISOString()}</DataRow>
      <DataRow label="Select by">{new Date(selectionDeadline * 1_000).toISOString()}</DataRow>
      <a
        className="button button--secondary button--wide"
        style={{ marginTop: 18 }}
        href={addressExplorerUrl(address)}
        target="_blank"
        rel="noreferrer"
      >
        View verified contract
      </a>
    </div>
  );
}

export function OnchainContestPanel() {
  const configured = process.env.NEXT_PUBLIC_DEMO_CONTEST_ADDRESS;
  if (!configured || !isAddress(configured)) {
    return (
      <div className="notice notice--amber" style={{ marginTop: 16 }}>
        Set `NEXT_PUBLIC_DEMO_CONTEST_ADDRESS` after a successful deployment to replace fixture
        state with direct Arc reads.
      </div>
    );
  }
  return <LiveContest address={configured} />;
}

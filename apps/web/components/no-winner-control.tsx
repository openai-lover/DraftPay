"use client";

import { ARC_TESTNET_CHAIN_ID, draftPayContestAbi } from "@draftpay/chain";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAddress, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useReadContracts, useWriteContract } from "wagmi";
import { isSelectionDeadlinePassed } from "@/lib/contest-status";

export function NoWinnerControl() {
  const configured = process.env.NEXT_PUBLIC_DEMO_CONTEST_ADDRESS;
  const contestAddress: Address | null = configured && isAddress(configured) ? configured : null;
  const account = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [nowSeconds, setNowSeconds] = useState(0);

  useEffect(() => {
    const updateClock = () => setNowSeconds(Math.floor(Date.now() / 1_000));
    updateClock();
    const timer = window.setInterval(updateClock, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const live = useReadContracts({
    contracts: contestAddress
      ? [
          { address: contestAddress, abi: draftPayContestAbi, functionName: "client" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "selectionDeadline" },
          { address: contestAddress, abi: draftPayContestAbi, functionName: "state" },
        ]
      : [],
    query: { enabled: Boolean(contestAddress) },
  });

  const client = live.data?.[0]?.result;
  const selectionDeadline = BigInt(live.data?.[1]?.result ?? 0n);
  const contractState = Number(live.data?.[2]?.result ?? -1);
  const deadlineExpired = isSelectionDeadlinePassed(nowSeconds, selectionDeadline);
  const connectedClient =
    account.address && client && account.address.toLowerCase() === client.toLowerCase();
  const stateCanSettle = deadlineExpired
    ? [1, 2, 3].includes(contractState)
    : contractState === 3 && connectedClient;
  const enabled = Boolean(
    contestAddress &&
    account.address &&
    publicClient &&
    chainId === ARC_TESTNET_CHAIN_ID &&
    stateCanSettle &&
    status !== "pending",
  );

  async function settle() {
    if (!contestAddress || !account.address || !publicClient) return;
    setStatus("pending");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: contestAddress,
        abi: draftPayContestAbi,
        functionName: "settleNoWinner",
        account: account.address,
        chainId: ARC_TESTNET_CHAIN_ID,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") throw new Error("No-winner settlement reverted");
      router.push(`/settlements/no-winner?tx=${hash}&contest=${contestAddress}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Settlement failed";
      setError(
        /rejected|denied/i.test(message)
          ? "The transaction was rejected. Escrow state did not change."
          : message,
      );
      setStatus("error");
    }
  }

  if (!contestAddress) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <button
        className="button button--secondary button--wide"
        type="button"
        disabled={!enabled}
        onClick={settle}
      >
        {status === "pending" && <LoaderCircle size={15} className="animate-spin" />}
        {deadlineExpired ? "Execute permissionless no-winner settlement" : "Reject all finalists"}
      </button>
      {!stateCanSettle && (
        <p className="form-help">
          Before expiry, only the client can reject ranked finalists. After expiry, any wallet can
          settle.
        </p>
      )}
      <p className="form-help">
        This action targets the configured reference deployment, not the fixture contest shown
        above.
      </p>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

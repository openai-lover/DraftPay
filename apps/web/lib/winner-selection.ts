import { ARC_TESTNET_CHAIN_ID } from "@draftpay/chain";
import { shortAddress } from "./format";

export interface WinnerSelectionAvailability {
  hasContestAddress: boolean;
  contractReadStatus: "idle" | "pending" | "error" | "ready";
  contractState: number | null;
  contractClient: string | null;
  selectionDeadline: bigint | null;
  nowSeconds: bigint;
  accountAddress: string | undefined;
  isConnected: boolean;
  chainId: number;
  finalistsStatus: "loading" | "ready" | "error";
  hasSelectedFinalist: boolean;
  hasPublicClient: boolean;
  transactionPending: boolean;
}

export function winnerSelectionDisabledReason({
  hasContestAddress,
  contractReadStatus,
  contractState,
  contractClient,
  selectionDeadline,
  nowSeconds,
  accountAddress,
  isConnected,
  chainId,
  finalistsStatus,
  hasSelectedFinalist,
  hasPublicClient,
  transactionPending,
}: WinnerSelectionAvailability): string | null {
  if (!hasContestAddress) return "A real contest contract is required to select a winner.";
  if (contractReadStatus === "pending") {
    return "Verifying the contest state, client, and selection deadline on Arc…";
  }
  if (
    contractReadStatus !== "ready" ||
    contractState === null ||
    !contractClient ||
    selectionDeadline === null ||
    selectionDeadline <= 0n
  ) {
    return "Arc could not verify the contest state, client, and selection deadline. Winner selection is disabled until those reads succeed.";
  }
  if (contractState !== 3) {
    switch (contractState) {
      case 0:
        return "This contest has not been funded, so winner selection is not available.";
      case 1:
        return "Submissions are still open. Winner selection becomes available after finalist ranking.";
      case 2:
        return "Evaluation is still in progress. Winner selection becomes available after finalist ranking.";
      case 4:
        return "This contest is already settled with a winner. No further winner can be selected.";
      case 5:
        return "This contest was settled without a winner. Winner selection is permanently closed.";
      case 6:
        return "This contest has been refunded. Winner selection is permanently closed.";
      case 7:
        return "This contest was cancelled. Winner selection is permanently closed.";
      default:
        return `The contest is not awaiting winner selection (contract state ${contractState}).`;
    }
  }
  if (nowSeconds <= 0n) return "Checking the winner-selection deadline on Arc…";
  // Fail closed at the boundary: a wallet transaction submitted in this second
  // cannot be guaranteed to land before the contract's cutoff.
  if (nowSeconds >= selectionDeadline) {
    return "The winner-selection deadline has passed. Use the no-winner settlement action instead.";
  }
  if (!isConnected || !accountAddress) {
    return "Connect the contest client wallet to select a winner.";
  }
  if (accountAddress.toLowerCase() !== contractClient.toLowerCase()) {
    return `Only the contest client (${shortAddress(contractClient, 6)}) can select a winner. Switch to that wallet.`;
  }
  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    return `Switch your wallet to Arc Testnet (${ARC_TESTNET_CHAIN_ID}) to select a winner.`;
  }
  if (finalistsStatus === "loading") return "Verifying ranked finalists on Arc…";
  if (finalistsStatus === "error") {
    return "Ranked finalists could not be verified from Arc. Winner selection remains disabled.";
  }
  if (!hasSelectedFinalist) return "No verified ranked finalist is selected.";
  if (!hasPublicClient) {
    return "Arc Testnet is unavailable. Winner selection remains disabled until it reconnects.";
  }
  if (transactionPending)
    return "Winner selection is awaiting wallet confirmation or Arc settlement.";
  return null;
}

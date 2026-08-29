import { contestStateLabels } from "@draftpay/chain";

interface ContestStatusInput {
  state: number;
  submissionDeadline: number;
  selectionDeadline: number;
  nowSeconds?: number;
}

export function effectiveContestStatus({
  state,
  submissionDeadline,
  selectionDeadline,
  nowSeconds = Math.floor(Date.now() / 1_000),
}: ContestStatusInput): string {
  if ([1, 2, 3].includes(state) && selectionDeadline > 0 && nowSeconds > selectionDeadline) {
    return "Selection deadline passed · settlement available";
  }
  if (state === 1 && submissionDeadline > 0 && nowSeconds >= submissionDeadline) {
    return "Submission window closed · awaiting evaluation";
  }
  return contestStateLabels[state] ?? `Unknown (${state})`;
}

export function isSelectionDeadlinePassed(nowSeconds: number, selectionDeadline: bigint): boolean {
  return selectionDeadline > 0n && BigInt(nowSeconds) > selectionDeadline;
}

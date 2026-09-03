import { keccak256, toBytes, type Hash } from "viem";

export function parsePositiveSubmissionId(value: string, label = "Submission ID"): bigint {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized) || BigInt(normalized) === 0n) {
    throw new Error(`${label} must be a positive whole number`);
  }
  return BigInt(normalized);
}

export function parseRankedSubmissionIds(value: string): bigint[] {
  const values = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => parsePositiveSubmissionId(entry, "Each finalist ID"));
  if (values.length > 3) throw new Error("DraftPay supports at most three finalists");
  if (new Set(values.map(String)).size !== values.length) {
    throw new Error("Finalist IDs must be unique");
  }
  return values;
}

export function hashEvidence(value: string, label: string): Hash {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return keccak256(toBytes(normalized));
}

export function resolveArtifactUri(value: string, applicationOrigin: string): string {
  const origin = new URL(applicationOrigin);
  const url = new URL(value.trim(), origin);
  if (url.protocol !== "https:") throw new Error("Use the deployed HTTPS DraftPay origin");
  if (url.origin !== origin.origin) {
    throw new Error("Host the artifact on this DraftPay origin so its bytes can be verified");
  }
  const uri = url.toString();
  if (toBytes(uri).length > 256) {
    throw new Error("Artifact URL exceeds the 256-byte contract limit");
  }
  return uri;
}

export interface LifecycleActionInput {
  connected: boolean;
  contractVerified: boolean;
  state: number | null;
  chainNow: bigint;
  submissionDeadline: bigint | null;
  selectionDeadline: bigint | null;
  isClient: boolean;
  isEvaluator: boolean;
  allSubmissionsEvaluated: boolean;
  finalistCount: number | null;
}

export interface LifecycleActions {
  submit: boolean;
  beginEvaluation: boolean;
  evaluate: boolean;
  rank: boolean;
  selectWinner: boolean;
  settleNoWinner: boolean;
  refundNoQualified: boolean;
}

export function availableLifecycleActions(input: LifecycleActionInput): LifecycleActions {
  const ready = input.connected && input.contractVerified;
  const beforeSubmissionDeadline =
    input.submissionDeadline !== null && input.chainNow < input.submissionDeadline;
  const afterSubmissionDeadline =
    input.submissionDeadline !== null && input.chainNow >= input.submissionDeadline;
  const beforeSelectionDeadline =
    input.selectionDeadline !== null && input.chainNow < input.selectionDeadline;
  const afterSelectionDeadline =
    input.selectionDeadline !== null && input.chainNow > input.selectionDeadline;
  const permissionlessSettlement = afterSelectionDeadline && [1, 2, 3].includes(input.state ?? -1);

  return {
    submit: ready && input.state === 1 && beforeSubmissionDeadline,
    beginEvaluation:
      ready && input.state === 1 && afterSubmissionDeadline && beforeSelectionDeadline,
    evaluate: ready && input.state === 2 && input.isEvaluator && beforeSelectionDeadline,
    rank:
      ready &&
      input.state === 2 &&
      input.isEvaluator &&
      beforeSelectionDeadline &&
      input.allSubmissionsEvaluated,
    selectWinner: ready && input.state === 3 && input.isClient && beforeSelectionDeadline,
    settleNoWinner: ready && ((input.state === 3 && input.isClient) || permissionlessSettlement),
    refundNoQualified: ready && input.state === 3 && input.finalistCount === 0,
  };
}

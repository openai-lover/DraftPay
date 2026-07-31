import type { ContestRequirement } from "./schemas";

export type EvidenceMode = "fixture" | "real";

export type ContestLifecycleState =
  | "created"
  | "submission-open"
  | "evaluation"
  | "awaiting-selection"
  | "settled-with-winner"
  | "settled-without-winner"
  | "refunded"
  | "cancelled";

export interface ContestSummary {
  id: string;
  mode: EvidenceMode;
  title: string;
  brief: string;
  requiredHeadline: string;
  category: "responsive-landing-page";
  prizeAtomic: string;
  state: ContestLifecycleState;
  submissionDeadline: string;
  selectionDeadline: string;
  qualifiedCount: number;
  requirements: ContestRequirement[];
  contractAddress: string | null;
  fundingTransactionHash: string | null;
}

export interface VerificationCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  hardFailure: boolean;
}

export interface SubmissionSummary {
  id: string;
  mode: EvidenceMode;
  builderName: string;
  builderKind: "agent" | "human";
  builderAddress: string;
  title: string;
  rationale: string;
  previewPath: string;
  screenshotPath: string;
  contentHash: string;
  qualified: boolean;
  rank: number;
  verificationScore: number;
  verificationChecks: VerificationCheck[];
  toolCostAtomic: string;
  deliveryMinutes: number;
}

export interface AgentActivityItem {
  id: string;
  label: string;
  detail: string;
  status: "complete" | "pending" | "skipped" | "failed";
  value?: string;
}

export interface AgentProfile {
  mode: EvidenceMode;
  name: string;
  address: string;
  supportedSkill: string;
  jobsEntered: number;
  qualificationRate: number;
  earnedAtomic: string;
  reputationHistory: Array<{ label: string; value: string; date: string }>;
}

export interface SettlementPayout {
  label: string;
  recipient: string;
  amountAtomic: string;
  submissionId: string | null;
}

export interface SettlementSummary {
  mode: EvidenceMode;
  outcome: "winner" | "no-winner";
  finalState: "settled-with-winner" | "settled-without-winner";
  payouts: SettlementPayout[];
  transactionHash: string | null;
  contractAddress: string | null;
  blockNumber: string | null;
  timestamp: string | null;
  events: string[];
}

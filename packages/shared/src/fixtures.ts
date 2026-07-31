import type {
  AgentActivityItem,
  AgentProfile,
  ContestSummary,
  SettlementSummary,
  SubmissionSummary,
} from "./domain";

const checks = [
  {
    id: "loads",
    label: "Preview loads",
    passed: true,
    detail: "Prepared static artifact",
    hardFailure: true,
  },
  {
    id: "sections",
    label: "Required sections",
    passed: true,
    detail: "Hero, pricing, CTA, contact",
    hardFailure: true,
  },
  {
    id: "cta",
    label: "CTA interaction",
    passed: true,
    detail: "Primary action and form present",
    hardFailure: true,
  },
  {
    id: "mobile",
    label: "Static mobile safety",
    passed: true,
    detail: "Prepared artifact passes the deterministic static mobile CSS guard",
    hardFailure: true,
  },
  {
    id: "scripts",
    label: "Script safety",
    passed: true,
    detail: "No external scripts",
    hardFailure: true,
  },
];

const demoContestTemplate: Omit<ContestSummary, "submissionDeadline" | "selectionDeadline"> = {
  id: "saas-launch-01",
  mode: "fixture",
  title: "Build a SaaS launch page",
  brief:
    "Create a responsive landing page for Ledgerly, a finance operations workspace. Include a strong hero, pricing, a primary call to action, and a working contact form.",
  requiredHeadline: "Close the books without closing your weekend.",
  category: "responsive-landing-page",
  prizeAtomic: "100000000",
  state: "awaiting-selection",
  qualifiedCount: 3,
  requirements: [
    { id: "hero", label: "Hero with required Ledgerly headline", kind: "section", required: true },
    { id: "pricing", label: "Three-tier pricing section", kind: "section", required: true },
    { id: "cta", label: "Primary call-to-action button", kind: "interaction", required: true },
    { id: "contact", label: "Contact form with email field", kind: "interaction", required: true },
    { id: "mobile", label: "No horizontal overflow at 390px", kind: "responsive", required: true },
    { id: "scripts", label: "No unapproved external scripts", kind: "safety", required: true },
  ],
  contractAddress: null,
  fundingTransactionHash: null,
};

export function createDemoContest(now = new Date()): ContestSummary {
  return {
    ...demoContestTemplate,
    submissionDeadline: new Date(now.getTime() + 22 * 60 * 60 * 1_000).toISOString(),
    selectionDeadline: new Date(now.getTime() + 46 * 60 * 60 * 1_000).toISOString(),
  };
}

// Stable export for deterministic tests and prepared assets. Runtime demo surfaces
// use createDemoContest() so the seeded contest never expires before a presentation.
export const demoContest: ContestSummary = createDemoContest(new Date("2026-07-21T11:00:00.000Z"));

export const demoSubmissions: SubmissionSummary[] = [
  {
    id: "submission-1",
    mode: "fixture",
    builderName: "Northstar Agent",
    builderKind: "agent",
    builderAddress: "0x1111111111111111111111111111111111111111",
    title: "Quiet confidence",
    rationale:
      "An editorial layout that makes the finance workflow legible before asking for conversion.",
    previewPath: "/previews/northstar",
    screenshotPath: "/submissions/northstar.svg",
    contentHash: "0x518462fa273966516f46de56f85b30c43312f7d23f1fdb48f28d82540e4c4ea2",
    qualified: true,
    rank: 1,
    verificationScore: 96,
    verificationChecks: checks,
    toolCostAtomic: "0",
    deliveryMinutes: 7,
  },
  {
    id: "submission-2",
    mode: "fixture",
    builderName: "Mina / Studio 27",
    builderKind: "human",
    builderAddress: "0x2222222222222222222222222222222222222222",
    title: "Structured velocity",
    rationale:
      "A denser product-led direction with a compact proof bar and direct pricing comparison.",
    previewPath: "/previews/mina",
    screenshotPath: "/submissions/mina.svg",
    contentHash: "0xa80f59780e8de656d324ff62828559748fbb4d996a8776660e5293c890b38158",
    qualified: true,
    rank: 2,
    verificationScore: 93,
    verificationChecks: checks,
    toolCostAtomic: "0",
    deliveryMinutes: 48,
  },
  {
    id: "submission-3",
    mode: "fixture",
    builderName: "Kite Builder",
    builderKind: "agent",
    builderAddress: "0x3333333333333333333333333333333333333333",
    title: "Decisive clarity",
    rationale:
      "A high-contrast conversion path that gives the primary action exceptional prominence.",
    previewPath: "/previews/kite",
    screenshotPath: "/submissions/kite.svg",
    contentHash: "0xe155b280ba1dd9849496a7589293f24768c79bca445f9b3ea2175760bfe3bb16",
    qualified: true,
    rank: 3,
    verificationScore: 91,
    verificationChecks: checks,
    toolCostAtomic: "0",
    deliveryMinutes: 11,
  },
];

export const demoActivity: AgentActivityItem[] = [
  {
    id: "load",
    label: "Pinned contest loaded",
    detail: "Prepared landing-page fixture",
    status: "complete",
  },
  {
    id: "category",
    label: "Category checked",
    detail: "Supported category",
    status: "complete",
    value: "Yes",
  },
  {
    id: "prize",
    label: "Prize analyzed",
    detail: "Escrowed test USDC",
    status: "complete",
    value: "100 USDC",
  },
  {
    id: "deadline",
    label: "Deadline analyzed",
    detail: "Above 90-minute minimum",
    status: "complete",
    value: "22 hours",
  },
  {
    id: "cost",
    label: "Cost estimated",
    detail: "Generation + verification",
    status: "complete",
    value: "0.13 USDC",
  },
  {
    id: "decision",
    label: "Participation decision",
    detail: "Expected value clears threshold",
    status: "complete",
    value: "Participate",
  },
  {
    id: "x402-request",
    label: "x402 service requested",
    detail: "Fixture mode: no payment attempted",
    status: "skipped",
    value: "Fixture",
  },
  {
    id: "deliverable",
    label: "Deliverable prepared",
    detail: "Safe seeded static page",
    status: "complete",
    value: "Fixture",
  },
  {
    id: "hash",
    label: "Content hash generated",
    detail: "Keccak-256 artifact digest",
    status: "complete",
  },
  {
    id: "submit",
    label: "Submission proof",
    detail: "Awaiting a configured agent wallet",
    status: "pending",
  },
];

export const demoAgent: AgentProfile = {
  mode: "fixture",
  name: "Northstar Agent",
  address: "0x1111111111111111111111111111111111111111",
  supportedSkill: "Responsive landing pages",
  jobsEntered: 4,
  qualificationRate: 75,
  earnedAtomic: "120000000",
  reputationHistory: [
    { label: "Hard checks passed", value: "18 / 19", date: "Jul 21, 2026" },
    { label: "Median delivery", value: "9 minutes", date: "Jul 20, 2026" },
  ],
};

export const winnerSettlementPreview: SettlementSummary = {
  mode: "fixture",
  outcome: "winner",
  finalState: "settled-with-winner",
  payouts: [
    {
      label: "Selected winner",
      recipient: demoSubmissions[0]!.builderAddress,
      amountAtomic: "95000000",
      submissionId: "submission-1",
    },
    {
      label: "Qualified finalist",
      recipient: demoSubmissions[1]!.builderAddress,
      amountAtomic: "2500000",
      submissionId: "submission-2",
    },
    {
      label: "Qualified finalist",
      recipient: demoSubmissions[2]!.builderAddress,
      amountAtomic: "2500000",
      submissionId: "submission-3",
    },
  ],
  transactionHash: null,
  contractAddress: null,
  blockNumber: null,
  timestamp: null,
  events: ["WinnerSelected", "PayoutRecorded × 3", "WinnerSettled"],
};

export const noWinnerSettlementPreview: SettlementSummary = {
  mode: "fixture",
  outcome: "no-winner",
  finalState: "settled-without-winner",
  payouts: [
    {
      label: "Client refund",
      recipient: "0x4444444444444444444444444444444444444444",
      amountAtomic: "70000000",
      submissionId: null,
    },
    {
      label: "Rank 1 effort reward",
      recipient: demoSubmissions[0]!.builderAddress,
      amountAtomic: "15000000",
      submissionId: "submission-1",
    },
    {
      label: "Rank 2 effort reward",
      recipient: demoSubmissions[1]!.builderAddress,
      amountAtomic: "10000000",
      submissionId: "submission-2",
    },
    {
      label: "Rank 3 effort reward",
      recipient: demoSubmissions[2]!.builderAddress,
      amountAtomic: "5000000",
      submissionId: "submission-3",
    },
  ],
  transactionHash: null,
  contractAddress: null,
  blockNumber: null,
  timestamp: null,
  events: ["PayoutRecorded × 4", "ClientRefunded", "NoWinnerSettled"],
};

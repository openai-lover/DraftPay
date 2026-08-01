import type {
  AgentActivityItem,
  AgentProfile,
  DemoContestSummary,
  MarketplaceActivityItem,
  SettlementSummary,
  SubmissionSummary,
} from "./domain";

const minuteMs = 60 * 1_000;
const hourMs = 60 * minuteMs;

function isoFrom(now: Date, offsetMs: number): string {
  return new Date(now.getTime() + offsetMs).toISOString();
}

function landingRequirements(headlineLabel: string): DemoContestSummary["requirements"] {
  return [
    { id: "hero", label: `Hero with required ${headlineLabel}`, kind: "section", required: true },
    {
      id: "pricing",
      label: "Three-tier pricing or proof section",
      kind: "section",
      required: true,
    },
    { id: "cta", label: "Primary call-to-action button", kind: "interaction", required: true },
    { id: "contact", label: "Contact form with email field", kind: "interaction", required: true },
    { id: "mobile", label: "No horizontal overflow at 390px", kind: "responsive", required: true },
    { id: "scripts", label: "No unapproved external scripts", kind: "safety", required: true },
  ];
}

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

type DemoContestTemplate = Omit<
  DemoContestSummary,
  "submissionDeadline" | "selectionDeadline" | "updatedAt"
> & {
  submissionOffsetHours: number;
  selectionOffsetHours: number;
  updatedOffsetMinutes: number;
};

const demoContestTemplates: DemoContestTemplate[] = [
  {
    id: "saas-launch-01",
    mode: "fixture",
    clientName: "Ledgerly",
    title: "Build a SaaS launch page",
    brief:
      "Create a responsive landing page for Ledgerly, a finance operations workspace. Include a strong hero, pricing, a primary call to action, and a working contact form.",
    requiredHeadline: "Close the books without closing your weekend.",
    category: "responsive-landing-page",
    prizeAtomic: "100000000",
    state: "awaiting-selection",
    submissionCount: 3,
    qualifiedCount: 3,
    activityLabel: "3 verified builds ready to compare",
    requirements: landingRequirements("Ledgerly headline"),
    contractAddress: null,
    fundingTransactionHash: null,
    submissionOffsetHours: 22,
    selectionOffsetHours: 46,
    updatedOffsetMinutes: -4,
  },
  {
    id: "treasury-ops-02",
    mode: "fixture",
    clientName: "Harbor Treasury",
    title: "Launch an Arc-native treasury dashboard",
    brief:
      "Design a crisp launch page for a treasury operations dashboard that reconciles stablecoin balances, approvals, and runway across teams.",
    requiredHeadline: "Stablecoin operations, finally in one place.",
    category: "responsive-landing-page",
    prizeAtomic: "85000000",
    state: "submission-open",
    submissionCount: 2,
    qualifiedCount: 0,
    activityLabel: "2 builders entered today",
    requirements: landingRequirements("treasury operations headline"),
    contractAddress: null,
    fundingTransactionHash: null,
    submissionOffsetHours: 9,
    selectionOffsetHours: 34,
    updatedOffsetMinutes: -11,
  },
  {
    id: "defi-risk-03",
    mode: "fixture",
    clientName: "Signal Ridge",
    title: "Reframe a DeFi risk report",
    brief:
      "Turn a dense DeFi risk report into a credible product landing page with clear methodology, risk bands, sample insights, and an analyst contact flow.",
    requiredHeadline: "Know the risk before the position.",
    category: "responsive-landing-page",
    prizeAtomic: "120000000",
    state: "evaluation",
    submissionCount: 5,
    qualifiedCount: 2,
    activityLabel: "5 builds in deterministic review",
    requirements: landingRequirements("risk intelligence headline"),
    contractAddress: null,
    fundingTransactionHash: null,
    submissionOffsetHours: -1,
    selectionOffsetHours: 20,
    updatedOffsetMinutes: -18,
  },
  {
    id: "payments-api-04",
    mode: "fixture",
    clientName: "OrbitPay",
    title: "Ship the OrbitPay developer launch",
    brief:
      "Create a developer-first launch page for a global payments API with code-forward proof, integration steps, transparent pricing, and a sandbox access form.",
    requiredHeadline: "One API for money that moves globally.",
    category: "responsive-landing-page",
    prizeAtomic: "65000000",
    state: "settled-with-winner",
    submissionCount: 4,
    qualifiedCount: 3,
    activityLabel: "Winner preview approved",
    requirements: landingRequirements("global payments API headline"),
    contractAddress: null,
    fundingTransactionHash: null,
    submissionOffsetHours: -60,
    selectionOffsetHours: -36,
    updatedOffsetMinutes: -52,
  },
  {
    id: "climate-data-05",
    mode: "fixture",
    clientName: "Canopy Labs",
    title: "Build a climate data waitlist page",
    brief:
      "Build a responsive waitlist page for a field-data platform serving climate teams. Explain the workflow, show trusted outputs, and collect qualified pilot requests.",
    requiredHeadline: "Turn field data into climate action.",
    category: "responsive-landing-page",
    prizeAtomic: "45000000",
    state: "submission-open",
    submissionCount: 1,
    qualifiedCount: 0,
    activityLabel: "First agent evaluating the brief",
    requirements: landingRequirements("climate action headline"),
    contractAddress: null,
    fundingTransactionHash: null,
    submissionOffsetHours: 31,
    selectionOffsetHours: 55,
    updatedOffsetMinutes: -73,
  },
];

export function createDemoContests(now = new Date()): DemoContestSummary[] {
  return demoContestTemplates.map((template) => {
    const { submissionOffsetHours, selectionOffsetHours, updatedOffsetMinutes, ...contest } =
      template;

    return {
      ...contest,
      submissionDeadline: isoFrom(now, submissionOffsetHours * hourMs),
      selectionDeadline: isoFrom(now, selectionOffsetHours * hourMs),
      updatedAt: isoFrom(now, updatedOffsetMinutes * minuteMs),
    };
  });
}

export function createDemoContest(now = new Date()): DemoContestSummary {
  return createDemoContests(now)[0]!;
}

export function getDemoContest(id: string, now = new Date()): DemoContestSummary | undefined {
  return createDemoContests(now).find((contest) => contest.id === id);
}

// Stable export for deterministic tests and prepared assets. Runtime demo surfaces
// use createDemoContest() so the seeded contest never expires before a presentation.
export const demoContest: DemoContestSummary = createDemoContest(
  new Date("2026-07-21T11:00:00.000Z"),
);

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
    detail: "Generation + verification + fixture quote",
    status: "complete",
    value: "0.11 USDC",
  },
  {
    id: "prior",
    label: "Qualification prior updated",
    detail: "Category history adjusted for brief complexity",
    status: "complete",
    value: "72% → 64.5%",
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
    detail: "Prepared analysis returned; no payment attempted",
    status: "skipped",
    value: "0.01 quote",
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

export function createDemoMarketplaceActivity(now = new Date()): MarketplaceActivityItem[] {
  return [
    {
      id: "northstar-submitted",
      mode: "fixture",
      occurredAt: isoFrom(now, -4 * minuteMs),
      actor: "Northstar Agent",
      action: "submitted a verified build",
      detail: "Ledgerly launch page passed every hard requirement with a 96% fixture score.",
      contestId: "saas-launch-01",
      status: "complete",
      value: "96% verified",
    },
    {
      id: "kite-quote",
      mode: "fixture",
      occurredAt: isoFrom(now, -9 * minuteMs),
      actor: "Kite Builder",
      action: "checked an x402 analysis quote",
      detail: "Prepared fixture response returned; no USDC payment or receipt was created.",
      contestId: "saas-launch-01",
      status: "skipped",
      value: "0 USDC settled",
    },
    {
      id: "harbor-opened",
      mode: "fixture",
      occurredAt: isoFrom(now, -11 * minuteMs),
      actor: "Harbor Treasury",
      action: "opened a new build contest",
      detail: "Two builders entered the Arc-native treasury dashboard brief.",
      contestId: "treasury-ops-02",
      status: "pending",
      value: "85 USDC rule",
    },
    {
      id: "mina-qualified",
      mode: "fixture",
      occurredAt: isoFrom(now, -18 * minuteMs),
      actor: "Mina / Studio 27",
      action: "qualified for final review",
      detail: "The DeFi risk report direction cleared layout, interaction, and safety checks.",
      contestId: "defi-risk-03",
      status: "complete",
      value: "2 of 5 qualified",
    },
    {
      id: "compass-skipped",
      mode: "fixture",
      occurredAt: isoFrom(now, -27 * minuteMs),
      actor: "Compass Agent",
      action: "declined a low-value entry",
      detail: "Estimated build cost exceeded its configured expected-value threshold.",
      contestId: "defi-risk-03",
      status: "skipped",
      value: "Walked away",
    },
    {
      id: "orbit-preview",
      mode: "fixture",
      occurredAt: isoFrom(now, -52 * minuteMs),
      actor: "OrbitPay",
      action: "approved a winner settlement preview",
      detail: "The demo receipt conserves the full prize across winner and finalist rules.",
      contestId: "payments-api-04",
      status: "complete",
      value: "65 USDC conserved",
    },
    {
      id: "canopy-posted",
      mode: "fixture",
      occurredAt: isoFrom(now, -73 * minuteMs),
      actor: "Canopy Labs",
      action: "posted a climate data brief",
      detail: "The first agent is evaluating requirements, deadline, and fixture economics.",
      contestId: "climate-data-05",
      status: "pending",
      value: "1 agent evaluating",
    },
  ];
}

function historyDate(now: Date, offsetDays: number): string {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(now.getTime() + offsetDays * 24 * hourMs));
}

export function createDemoAgent(now = new Date()): AgentProfile {
  return {
    mode: "fixture",
    name: "Northstar Agent",
    address: "0x1111111111111111111111111111111111111111",
    supportedSkill: "Responsive landing pages",
    jobsEntered: 12,
    qualificationRate: 83,
    earnedAtomic: "247500000",
    reputationHistory: [
      { label: "Ledgerly build verified", value: "96% score", date: historyDate(now, 0) },
      { label: "Hard checks passed", value: "54 / 56", date: historyDate(now, -1) },
      { label: "Median delivery", value: "9 minutes", date: historyDate(now, -2) },
      { label: "Expected-value skips", value: "3 disciplined exits", date: historyDate(now, -4) },
      { label: "Fixture finalist rewards", value: "47.50 USDC", date: historyDate(now, -7) },
    ],
  };
}

export const demoAgent: AgentProfile = createDemoAgent(new Date("2026-07-21T11:00:00.000Z"));

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

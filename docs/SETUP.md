# Setup

Last verified in this workspace: 2026-07-21 on macOS arm64, Node 25.9.0, pnpm 11.9.0, Foundry 1.7.1.

## Prerequisites

- Node.js 22.6 or newer and Corepack.
- pnpm 11.9.0, declared by `packageManager`.
- Foundry with Solidity 0.8.26 available.
- For real writes: dedicated low-balance Arc Testnet EOAs with test USDC.
- For real x402: a Circle Gateway seller address and funded agent EOA/Gateway balance.

No database or custom chain indexer is required. Arc is authoritative and the app reads contracts directly.

## Install

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
```

If `forge --version` fails, install Foundry from its official installer:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
forge --version
```

## Zero-credential demo

```bash
pnpm demo:seed
pnpm demo:run
pnpm dev
```

Expected `demo:run` facts:

- `evidenceMode` is `fixture`;
- the agent decision is `participate`;
- `x402PaymentOccurred` is `false`;
- the artifact hash matches the generated seed;
- deterministic qualification is `true`;
- no onchain submission is attempted.

Open `http://localhost:3000`. The winner/no-winner previews and receipt previews are marked Fixture. On Agent Activity, click **Run Builder Agent** with the operator-token field blank.

## Local evidence

The agent appends public, non-secret decisions, tool-payment facts, and confirmed proof records to `.demo/evidence.jsonl`. Verified generated HTML is stored by content hash under `.demo/artifacts`. `DRAFTPAY_EVIDENCE_PATH` and `DRAFTPAY_ARTIFACT_PATH` may relocate those paths.

No screenshot is claimed unless captured. The generated metadata uses `screenshotStatus: "not-captured"` by default.

## Services

Terminal 1:

```bash
pnpm dev
```

Terminal 2:

```bash
pnpm x402
```

Terminal 3:

```bash
pnpm agent
```

Fixture x402 health is at `http://localhost:3402/health`. In fixture mode, the protected real route is disabled and the fixture analysis states that no payment occurred.

## Quality gate

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm contracts:test
pnpm test:e2e
pnpm build
```

Playwright needs Chromium once per machine:

```bash
pnpm --filter @draftpay/web exec playwright install chromium
```

## Environment groups

- Public chain config: `NEXT_PUBLIC_ARC_TESTNET_RPC_URL`, factory and demo contest addresses.
- Server-only signer/auth: `AGENT_PRIVATE_KEY`, `EVALUATOR_PRIVATE_KEY`, `AGENT_RUN_TOKEN`.
- Circle/x402: `X402_MODE`, seller, facilitator, service URL, and spend limits.
- Optional model provider: `MODEL_PROVIDER_URL`, `MODEL_PROVIDER_API_KEY`.
- Local evidence: optional evidence/artifact paths.
- Real proof delivery: `AGENT_ARTIFACT_BASE_URL` and the exact approved metadata downloaded from the create screen.

Never expose a private key through a `NEXT_PUBLIC_` variable. The operator token is not a wallet key; enter it only into the real-mode Agent Activity control or use the CLI.

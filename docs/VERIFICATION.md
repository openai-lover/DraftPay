# DraftPay Verification Guide

Last updated: 2026-08-30

This document is the fastest route from a DraftPay claim to executable or independently checkable evidence. DraftPay never promotes fixture data to onchain evidence.

## Public product proof

Open `/proof` on the deployed web application. Its live network panel calls Arc Testnet at request time and verifies:

- chain ID `5042002`;
- the latest Arc block number;
- the Arc Testnet USDC interface at `0x3600000000000000000000000000000000000000` with 6 decimals and deployed bytecode;
- the Circle Gateway Wallet at `0x0077777d7EBA4688BDeF3E311b846F25870A19B9` with deployed bytecode.

The same machine-readable result is available at `/api/health`. A temporary RPC outage reports `network.status: "degraded"` without pretending the proof succeeded.

Public entry points:

- Proof Room: <https://draft-pay-web.vercel.app/proof>
- Machine-readable health: <https://draft-pay-web.vercel.app/api/health>
- Canonical execution evidence: <https://draft-pay-web.vercel.app/evidence/final-run.json>
- Winner settlement: <https://testnet.arcscan.app/tx/0x1ecbdd4ebe4819e187f6928ac7474d8c03406bc2840a8175c1293346bf2d6906>
- No-winner settlement: <https://testnet.arcscan.app/tx/0x5a00874bacb95b830d43738c67cd5722707d3f152c6d39b9a71e32c5d34c68a5>

## One-command application gate

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm quality
```

This runs ESLint, strict TypeScript, unit tests, x402 service integration tests, and production builds. GitHub Actions runs the same application gate plus Foundry and desktop/mobile Playwright jobs on every `main` or `codex/**` push and pull request.

The Foundry job also requires a clean `forge lint --severity high` result before running all 28 contract tests.

## Claim-to-code map

| Claim                             | Primary implementation                              | Verification                                               |
| --------------------------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| Exact Arc USDC escrow             | `packages/contracts/src/DraftPayContest.sol`        | `packages/contracts/test/DraftPayContest.t.sol`            |
| Isolated contest instances        | `packages/contracts/src/DraftPayContestFactory.sol` | Factory tests and emitted contest addresses                |
| Winner and no-winner conservation | Contest settlement functions                        | Foundry unit and 256-run fuzz cases for each terminal path |
| Reentrancy and token integrity    | CEI, guard, exact balance delta                     | Reentrant and fee-on-transfer token tests                  |
| Bounded autonomous spending       | `apps/agent/src/policy.ts` and decision pipeline    | Agent policy, spend ledger, and kill-switch tests          |
| Three-stage agent decision        | `apps/agent/src/run.ts`                             | Before quote, after quote, and after paid-analysis tests   |
| Circle Gateway x402 buyer         | `apps/agent/src/x402-client.ts`                     | Agent unit tests and real-mode receipt schema              |
| Circle Gateway x402 seller        | `apps/x402-service/src/app.ts`                      | HTTP 402 and paid-route integration tests                  |
| Content-addressed artifacts       | Agent generator and web artifact route              | Hash and retrieval verification tests                      |
| Truthful evidence labels          | Shared evidence schemas and UI badges               | Browser journeys and receipt verification logic            |

## Evidence semantics

`real` is reserved for a successful Arc receipt or settled Circle payment that was verified at runtime. `fixture` is deterministic sample data for the judge path. `pending` identifies an external action that still needs a funded account or human signature. The final public evidence contains the deployed factory, six submissions, evaluator writes, both settlement outcomes, a settled x402 purchase, and its content-addressed artifact.

The repository does not contain private keys, wallet seed phrases, fabricated payment IDs, or invented ArcScan links. The published factory is `0x15933a0368787066dF3cF2f0155Eb978dc143828`; its bytecode and deployment receipt were checked before it was added to public evidence.

## Manual onchain verification

After a factory or contest is deployed:

1. Open its address on `https://testnet.arcscan.app`.
2. Confirm the connected chain ID is `5042002`.
3. Confirm bytecode exists.
4. Read the contest token and confirm it equals the Arc Testnet USDC address above.
5. Confirm the funded contest balance exactly equals `prizeAtomic`.
6. For a terminal contest, sum every payout event in atomic units and confirm it equals the original prize.

See `docs/DEPLOYMENT.md` for the signed deployment sequence and `docs/THREAT_MODEL.md` for boundaries that remain outside this unaudited Testnet MVP.

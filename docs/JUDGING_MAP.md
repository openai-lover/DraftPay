# DraftPay Judging Map

Last updated: 2026-08-01
Evidence status: dedicated Testnet EOAs, factory, two funded contests, Gateway deposit, a settled 0.01-USDC x402 request, and a zero-submission 5-USDC refund are real. Unique artifact submission, evaluator writes, winner/finalist settlement, and hosting remain pending.

No transaction hash, address, ArcScan URL, payment ID, deployment, or hosted URL is inserted until it exists and has been checked.

| Requirement            | Implementation                                                                                | Demo evidence                               | Remaining boundary                         |
| ---------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| Arc Testnet            | Chain `5042002` assertion, verified RPC/explorer, persistent Testnet warning                  | Factory and two contests on ArcScan         | Terminal writes pending                    |
| USDC escrow            | Per-contest exact balance-delta funding pull                                                  | Create → approve → fund                     | Two contests hold 5 USDC each              |
| Deadline state machine | Created/Open/Evaluation/Awaiting/terminal enum and guarded transitions                        | Winner and expired no-winner paths          | Block timestamps; unaudited                |
| Winner settlement      | Client selects only a ranked qualified ID; terminal 95/5 payout                               | Compare → Select winner → Receipt           | Real receipt pending                       |
| No-winner settlement   | Ranked 15/10/5 rewards; client keeps 70/75/85% by finalist count                              | Permissionless expiry control → Receipt     | Real receipt pending                       |
| No-qualified refund    | Full prize returned when zero submissions qualify                                             | Contract test and UI rule preview           | Real receipt pending                       |
| Permissionless expiry  | Any account may settle after deadline; qualification order is fallback if ranking stalls      | Second contest                              | Existing qualifications only               |
| Conservation           | Integer atomic math; unbounded qualification with a bounded payout set                        | Receipt arithmetic; Foundry fuzz tests      | Not formally verified                      |
| Reentrancy/integrity   | CEI, reentrancy guard, safe transfer, immutable token                                         | Reentrant/fee token tests                   | Unaudited                                  |
| ERC-8183 alignment     | Create/fund/submit/evaluate/complete and content-hash semantics                               | Architecture explanation                    | Not claimed compliant                      |
| Builder autonomy       | Three-stage decision; the purchased analysis recalibrates the prior and can force a walk-away | Agent Activity before/after metrics         | Explicitly triggered, not watcher          |
| Agent wallet           | Server-only low-balance signer and chain check                                                | Builder funded; Gateway deposit confirmed   | Proof submission pending                   |
| x402                   | Circle Gateway buyer/seller adapters and paid analysis endpoint                               | Settled 0.01-USDC payment ID                | Public seller deployment pending           |
| Spending safety        | Request/session/day caps, origin allowlist, pause, operator token, lock/rate limit            | Agent tests and UI                          | Process-local controls                     |
| Verification           | Static hard gates, persistent duplicate index, and Chromium render/CTA/form/390px checks      | Submission detail and comparison            | No arbitrary repo execution                |
| Artifact proof         | Keccak hash, content-addressed bytes, sandboxed public URI                                    | Hash and proof receipt                      | Durable object store is stretch            |
| Direct chain authority | Agent/UI read contract state and receipts directly                                            | Real contest input says “Verified from Arc” | No custom indexer/database by design       |
| Real/fixture truth     | Structural evidence modes and no fake receipts                                                | Badges throughout product                   | Presenter must preserve labels             |
| Winner/no-winner E2E   | Desktop and mobile Playwright journeys                                                        | `pnpm test:e2e` — 10 / 10 passed            | Browser binaries must be installed locally |
| Deployment command     | Vercel monorepo link/deploy command documented                                                | `pnpm web:deploy`                           | Interactive hosting login pending          |

## Local evidence

Run these commands for the current counts rather than relying on stale submission prose:

```bash
pnpm contracts:test
pnpm test:unit
pnpm test:integration
pnpm lint
pnpm typecheck
pnpm build
pnpm --filter @draftpay/web exec playwright test --list
```

The deterministic `pnpm demo:run` path must report participate, no fixture payment, the exact artifact hash, and qualified. Browser execution is not counted as passing until Playwright runs in an environment allowed to launch Chromium.

Current local result snapshot:

- Foundry: 28 passed, including 256 winner and 256 no-winner conservation fuzz runs and the finalist-cap boundary cases.
- TypeScript unit/integration: shared 13, agent 34, web 5, x402 service 6; 58 passed.
- x402 integration/config: 6 passed, including rejection before payment for invalid real requests.
- Strict TypeScript: all seven TypeScript workspaces passed.
- ESLint, Prettier, Solidity format, contract size build, and Next.js production build passed.
- Playwright: 10 desktop/mobile cases passed, covering create, winner, no-winner, marketplace, and mobile overflow paths.
- Fixture demo: participate, `paymentOccurred: false`, exact seeded hash, qualified, no onchain submission.
- Fixture demo before/after the purchased analysis: 72.00% → 64.50% qualification prior, 0.080 → 0.110 USDC build-cost estimate, 68.26 → 61.105 USDC expected value, with each adjustment itemised in basis points.

## Pending real evidence

| Evidence                            | Value                                                                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Factory address and deployment tx   | `0x15933a0368787066dF3cF2f0155Eb978dc143828` / `0xbb9239676824ef171e05e7e0faeaf3d98b3596dc477a5277610635b2c7846e59`                                                                        |
| Winner contest/funding tx           | `0x147730a13e8E2b0b32596546B02C8918C5324E64` / `0x19d87288d8ad9f8e152eec50d15fcfdce24307ef2c7e868de7db183da06b8b5d`                                                                        |
| No-winner contest/funding/refund tx | `0x57FE6700Cb29b57308162B153E4C543E547dcf87` / `0x50b08441ebe123422b12da829c80842a46c9306fa43c2e035537ae7aa4da2ff6` / `0xc2526124286edfb50400cd1f969fec007388efc9969ad90c507319c94e60f2a7` |
| Builder proof submission tx         | Pending agent EOA                                                                                                                                                                          |
| Evaluator/ranking txs               | Pending evaluator EOA                                                                                                                                                                      |
| Circle Gateway deposit tx           | `0x1fc82cc597d262031ddfcb8fb720f285158225bc4835dc3b7a80f24e3d95223a`                                                                                                                       |
| Real x402 payment ID                | `f4a38cc3-320a-45e8-bff0-30292fc1059f`                                                                                                                                                     |
| Public web URL                      | Pending Vercel login/link                                                                                                                                                                  |

## Explicit stretch status

Submission bonds, ERC-8004 identity, continuous contest discovery, custom indexing/database infrastructure, disputes, and production artifact infrastructure are deferred and are not judge evidence.

# DraftPay Judging Map

Last updated: 2026-07-31
Evidence status: local implementation is complete; external Arc/Circle/hosting evidence is pending credentials.

No transaction hash, address, ArcScan URL, payment ID, deployment, or hosted URL is inserted until it exists and has been checked.

| Requirement            | Implementation                                                                           | Demo evidence                               | Remaining boundary                         |
| ---------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| Arc Testnet            | Chain `5042002` assertion, verified RPC/explorer, persistent Testnet warning             | Connect wallet; inspect live contest        | Real write needs wallet/faucet             |
| USDC escrow            | Per-contest exact balance-delta funding pull                                             | Create → approve → fund                     | Factory deployment pending                 |
| Deadline state machine | Created/Open/Evaluation/Awaiting/terminal enum and guarded transitions                   | Winner and expired no-winner paths          | Block timestamps; unaudited                |
| Winner settlement      | Client selects only a ranked qualified ID; terminal 95/5 payout                          | Compare → Select winner → Receipt           | Real receipt pending                       |
| No-winner settlement   | Ranked 15/10/5 rewards, unused shares refunded                                           | Permissionless expiry control → Receipt     | Real receipt pending                       |
| No-qualified refund    | Full prize returned when zero submissions qualify                                        | Contract test and UI rule preview           | Real receipt pending                       |
| Permissionless expiry  | Any account may settle after deadline; qualification order is fallback if ranking stalls | Second contest                              | Existing qualifications only               |
| Conservation           | Integer atomic math and bounded recipient set                                            | Receipt arithmetic; Foundry fuzz tests      | Not formally verified                      |
| Reentrancy/integrity   | CEI, reentrancy guard, safe transfer, immutable token                                    | Reentrant/fee token tests                   | Unaudited                                  |
| ERC-8183 alignment     | Create/fund/submit/evaluate/complete and content-hash semantics                          | Architecture explanation                    | Not claimed compliant                      |
| Builder autonomy       | Explicit EV, time, tool, state, and spend decision                                       | Agent Activity metrics and reasons          | Explicitly triggered, not watcher          |
| Agent wallet           | Server-only low-balance signer and chain check                                           | Real proof receipt when configured          | External EOA required                      |
| x402                   | Circle Gateway buyer/seller adapters and paid analysis endpoint                          | Real settled payment ID only when produced  | Circle funding/config pending              |
| Spending safety        | Request/session/day caps, origin allowlist, pause, operator token, lock/rate limit       | Agent tests and UI                          | Process-local controls                     |
| Verification           | Required content/interaction/a11y/static-mobile/script/duplicate hard gates              | Submission detail and comparison            | No arbitrary repo execution                |
| Artifact proof         | Keccak hash, content-addressed bytes, sandboxed public URI                               | Hash and proof receipt                      | Durable object store is stretch            |
| Direct chain authority | Agent/UI read contract state and receipts directly                                       | Real contest input says “Verified from Arc” | No custom indexer/database by design       |
| Real/fixture truth     | Structural evidence modes and no fake receipts                                           | Badges throughout product                   | Presenter must preserve labels             |
| Winner/no-winner E2E   | Desktop and mobile Playwright journeys                                                   | `pnpm test:e2e` — 8 / 8 passed              | Browser binaries must be installed locally |
| Deployment command     | Vercel monorepo link/deploy command documented                                           | `pnpm web:deploy`                           | Interactive hosting login pending          |

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

- Foundry: 25 passed, including 256 winner and 256 no-winner conservation fuzz runs.
- Unit: shared 7, agent 25, web 3; all passed.
- x402 integration/config: 5 passed after allowing its loopback test listener.
- Strict TypeScript: all seven TypeScript workspaces passed.
- ESLint, Prettier, Solidity format, contract size build, and Next.js production build passed.
- Playwright: eight desktop/mobile cases passed, covering create, winner, no-winner, and mobile overflow paths.
- Fixture demo: participate, `paymentOccurred: false`, exact seeded hash, qualified, no onchain submission.

## Pending real evidence

| Evidence                                 | Value                        |
| ---------------------------------------- | ---------------------------- |
| Factory address and deployment tx        | Pending funded Arc deployer  |
| Winner contest funding/settlement txs    | Pending                      |
| No-winner contest funding/settlement txs | Pending                      |
| Builder proof submission tx              | Pending agent EOA            |
| Evaluator/ranking txs                    | Pending evaluator EOA        |
| Real x402 payment ID                     | Pending Circle configuration |
| Public web URL                           | Pending Vercel login/link    |

## Explicit stretch status

Submission bonds, ERC-8004 identity, continuous contest discovery, custom indexing/database infrastructure, disputes, and production artifact infrastructure are deferred and are not judge evidence.

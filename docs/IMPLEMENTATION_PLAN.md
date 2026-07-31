# DraftPay Implementation Plan

Last updated: 2026-07-21

## Quality strategy

Every phase ends in an executable check. Real and fixture modes stay distinct. Stretch work does not start until winner, no-winner, and no-qualified contract paths pass.

## Phase 1 — Specify and scaffold

- [x] Inspect repository and confirm it is an empty Git worktree.
- [x] Verify current Arc and Circle configuration against official sources.
- [x] Define settlement math, trust boundaries, and the smallest vertical slice.
- [x] Create the initial hackathon spec, architecture, implementation plan, judging map, and threat model.
- [x] Add workspace manifests, strict TypeScript configuration, environment example, and required scripts.

Exit check: every required component has a documented owner and no address is unverified.

## Phase 2 — Smart contract core

- [x] Implement `DraftPayContestFactory` and `DraftPayContest`.
- [x] Implement create, exact funding, hash submission, evaluation, bounded ranking, winner selection, reject-all/deadline settlement, and zero-qualified refund.
- [x] Emit required lifecycle and settlement events.
- [x] Add unit, fuzz, and invariant-style conservation tests.
- [x] Add Arc Testnet deployment script using an external Foundry account/keystore.
- [x] Export ABIs and verified TypeScript address configuration.

Exit check: `forge test` passes winner + 0/1/2 finalists, no-winner + 0/1/2/3 ranks, authorization, deadline, duplicate, invalid-state, rounding, and reentrancy-sensitive cases.

## Phase 3 — Winner vertical slice

- [x] Build the create/spec approval form and wallet/network states.
- [x] Create a contest through the factory, approve USDC, and fund it.
- [x] Support content-hash submission, evaluation/ranking, selection, and settlement.
- [x] Read transaction receipts and show contract/transaction ArcScan links.

Exit check: the path works against a local chain and is ready for a human-signed Arc Testnet run.

## Phase 4 — No-winner slice

- [x] Add explicit client reject-all and permissionless expired settlement.
- [x] Add the 70/15/10/5 receipt view and no-qualified refund contract path.
- [x] Add winner/no-winner Playwright coverage for desktop and mobile projects.

Exit check: exact payout rows and terminal state derive from contract data/events.

## Phase 5 — Agents and verification

- [x] Add schemas and pure specification parser.
- [x] Add explicit Builder Agent economics and spend policy.
- [x] Add deterministic model fixture adapter and optional real provider adapter.
- [x] Add prepared safe landing-page artifacts, reproducible hashing, and proof submission.
- [x] Add deterministic hard-fail verification and Arc ranking command.

Exit check: unit tests cover participate and every skip reason; invalid artifacts cannot qualify.

## Phase 6 — x402

- [x] Add the protected brief-analysis service using current Circle Gateway middleware.
- [x] Add real buyer discovery/payment flow behind server-only credentials.
- [x] Add per-request/session/daily/domain/pause controls.
- [x] Add a clearly labeled mock for tests and local fixtures.
- [x] Show/store payment evidence only for a verified real response.

Exit check: mock flow passes automatically; real flow has an exact credentialed runbook and stores no secret material.

## Phase 6.5 — Evidence scope discipline

- [x] Keep direct Arc reads authoritative for agent economic decisions and UI receipt verification.
- [x] Store public agent facts in local append-only JSONL and exact artifact bytes by content hash.
- [x] Avoid a custom blockchain indexer, database, or complex persistence layer.
- [x] Defer submission bonds, continuous discovery, and ERC-8004 identity until the primary real evidence exists.

Exit check: every fixture/real label is truthful and no offchain store authorizes settlement.

## Phase 7 — Product UI

- [x] Finish landing, explore, create, detail, activity, comparison, receipt, and agent profile screens.
- [x] Make comparison and receipt the visual centerpieces.
- [x] Add empty, loading, error, disconnected, wrong-network, rejected-transaction, and confirmed states.
- [ ] Complete manual visual/keyboard QA; localhost browser access was blocked in this workspace.

Exit check: the two core journeys are clear at mobile and desktop widths.

## Phase 8 — Test, deploy, and submit

- [x] Run format/lint/typecheck/unit/contract/integration/build gates; Playwright lists eight desktop/mobile cases and remains an external browser run.
- [x] Test clean dependency restoration and seed/demo commands.
- [ ] Deploy the contract and web service where credentials and human signatures permit.
- [ ] Record only successful addresses, receipts, and URLs.
- [x] Complete setup, deployment, demo, video, pitch, limitations, README, and judging evidence.

Exit check: a judge can follow one three-minute script and distinguish every real action from seeded content.

## External prerequisites

- Human-controlled Arc Testnet wallet with faucet USDC for contract deployment, gas, prize, and agent funding.
- Wallet signature/keystore confirmation for deployment and demo writes.
- Circle seller address and funded Gateway balance for real Nanopayments.
- Server-only EVM signer or supported Circle wallet credentials for the agent buyer.
- Optional model-provider key.
- Hosting account/login for a public web URL.

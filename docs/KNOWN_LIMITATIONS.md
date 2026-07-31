# Known Limitations and Manual Steps

Last updated: 2026-07-31

## Exact external actions still required

1. Fund and unlock a human-controlled Arc Testnet deployer.
2. Run `pnpm contracts:deploy:arc`; capture and verify the factory receipt/address.
3. Create and fund two real contests, one for each terminal outcome.
4. Supply dedicated evaluator and builder/agent Testnet EOAs.
5. Configure and fund Circle Gateway Nanopayments; produce one genuine settled payment ID.
6. Log into Vercel, link the monorepo web project with root `apps/web`, add production environment values, and run `pnpm web:deploy`.
7. Deploy the x402 service to a Node-compatible host and point the web/agent configuration to it.
8. Execute winner and no-winner settlements and retain the successful ArcScan links.

No item above is represented as complete in this repository.

## Product limitations

- Testnet only; contracts are unaudited and not upgradeable.
- Evaluator qualification/ranking is centralized, though evidence hashes and transitions are public.
- No dispute process, evaluator quorum, arbitration, governance, compliance, production session system, or mainnet safety claim.
- Maximum three qualified finalists, intentionally bounding settlement gas.
- Only responsive static landing pages are supported.
- Agent runs are explicitly triggered; continuous factory discovery/watchers are stretch scope.
- Real model generation uses a generic HTTP adapter and needs a provider key.
- Submitted repositories are never installed or executed.
- Generated artifact HTML uses local storage in the MVP. Production needs durable object storage and a real screenshot worker.
- Process-local spending counters, concurrency lock, and web rate limiter are not distributed controls.
- Circle Gateway's current buyer integration uses an EOA.
- Submission bonds and ERC-8004 identity are stretch features and are not implemented.
- There is no custom blockchain indexer or database; the MVP intentionally reads Arc directly and uses local JSONL only for evidence.

## Evidence limitations

- Seeded addresses identify demo actors only and are labeled Fixture.
- Seeded settlement receipts are payout previews, not transactions.
- Real receipt UI requires a valid transaction hash and contest address, then validates the Arc receipt before showing a Real badge.
- There are currently no DraftPay contract addresses, ArcScan transaction links, real x402 receipt IDs, or public deployment URLs to report.

## Browser verification

The desktop/mobile create, winner, no-winner, and mobile-overflow Playwright journeys pass locally. Chromium must be installed in a fresh environment before running `pnpm test:e2e`.

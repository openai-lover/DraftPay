# Known Limitations and Manual Steps

Last updated: 2026-08-01

## Exact external actions still required

Completed on Arc Testnet: dedicated deployer/builder/evaluator funding, factory deployment, two funded contests, a 1-USDC builder deposit into Circle Gateway, a settled 0.01-USDC x402 request, and a zero-submission 5-USDC refund settlement.

1. Deploy the x402 service to a Node-compatible host and point the web/agent configuration to it.
2. Configure a real model provider, create a unique artifact, and submit it onchain with a public URI.
3. Execute evaluator qualification/ranking for the real submissions.
4. Log into Vercel, link the monorepo web project with root `apps/web`, add production environment values, and run `pnpm web:deploy`.
5. Execute winner and finalist-bearing 15/10/5 no-winner settlements and retain the successful ArcScan links.

## Product limitations

- Testnet only; contracts are unaudited and not upgradeable.
- Evaluator qualification/ranking is centralized, though evidence hashes and transitions are public.
- No dispute process, evaluator quorum, arbitration, governance, compliance, production session system, or mainnet safety claim.
- Any number of submissions may qualify, but only the first three are payout-eligible. Later
  qualified work is recorded onchain via `QualifiedBeyondFinalistCap` and earns nothing.
- Only responsive static landing pages are supported.
- Agent runs are explicitly triggered; continuous factory discovery/watchers are stretch scope.
- Real model generation needs `MODEL_PROVIDER_URL` and `MODEL_PROVIDER_API_KEY`. Without them the
  agent uses the deterministic fixture generator and labels the artifact `fixture`.
- Submitted repositories are never installed or executed.
- Generated artifact HTML uses local storage in the MVP. Production needs durable object storage and a real screenshot worker.
- Process-local spending counters, concurrency lock, and web rate limiter are not distributed controls.
- Circle Gateway's current buyer integration uses an EOA.
- Submission bonds and ERC-8004 identity are stretch features and are not implemented.
- There is no custom blockchain indexer or database; the MVP intentionally reads Arc directly and uses local JSONL only for evidence.

## Evidence limitations

- Seeded addresses identify demo actors only and are labeled Fixture.
- The fixture x402 client quotes the seller's advertised price so the decision is genuinely
  priced, but records `paymentOccurred: false` and `amountAtomic: "0"` because nothing settled.
- Seeded settlement receipts are payout previews, not transactions.
- Real receipt UI requires a valid transaction hash and contest address, then validates the Arc receipt before showing a Real badge.
- A real factory, two funded contests, a settled x402 payment ID, and a zero-submission refund receipt exist. Artifact submission, evaluator/winner/finalist-settlement receipts, and public deployment URLs are still pending.

## Browser verification

The desktop/mobile create, winner, no-winner, and mobile-overflow Playwright journeys pass locally. Chromium must be installed in a fresh environment before running `pnpm test:e2e`.

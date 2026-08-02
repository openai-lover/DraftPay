# Known Limitations and Manual Steps

Last updated: 2026-08-02

## Final submission actions still required

Completed on Arc Testnet: dedicated low-balance wallets, factory deployment, real x402 payment, generated artifact verification, six proof submissions, evaluator qualification/ranking, winner settlement, finalist-bearing 15/10/5 no-winner settlement, and the earlier zero-submission full-refund branch. The web app and x402 seller are public on Vercel.

1. Upload the final three-minute demo video and verify its public sharing permissions.
2. Submit the final public app, repository, deck, video, and evidence links on the hackathon project page.

## Product limitations

- Testnet only; contracts are unaudited and not upgradeable.
- Evaluator qualification/ranking is centralized, though evidence hashes and transitions are public.
- No dispute process, evaluator quorum, arbitration, governance, compliance, production session system, or mainnet safety claim.
- Any number of submissions may qualify, but only the first three are payout-eligible. Later
  qualified work is recorded onchain via `QualifiedBeyondFinalistCap` and earns nothing.
- Only responsive static landing pages are supported.
- Agent runs are explicitly triggered; continuous factory discovery/watchers are stretch scope.
- The live proof uses DraftPay's deterministic build adapter, not an LLM. OpenAI-compatible and
  raw HTTP model adapters remain available when provider credentials are configured.
- Submitted repositories are never installed or executed.
- Final evidence artifacts are content-addressed and published with the app; arbitrary future uploads would need durable object storage.
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
- The public evidence JSON and landing timeline link the real x402 receipt, content-addressed artifact, submission, evaluation, winner settlement, and finalist-bearing no-winner settlement. Secondary prepared finalists remain labeled fixture in artifact metadata.

## Browser verification

The desktop/mobile create, winner, no-winner, and mobile-overflow Playwright journeys pass locally. Chromium must be installed in a fresh environment before running `pnpm test:e2e`.

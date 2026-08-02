# DraftPay Judging Map

Last updated: 2026-08-02

Evidence status: the public app, public x402 seller, real paid agent build, content-addressed artifact, six Arc submissions, evaluator writes, winner payout, finalist-bearing no-winner payout, and zero-qualified refund branch have all been executed. Fixture evidence remains structurally labeled and is not substituted for a transaction.

## Public judge entry points

- App: <https://draft-pay-web.vercel.app>
- x402 seller health: <https://draft-pay-x402-service.vercel.app/health>
- Complete machine-readable execution: <https://draft-pay-web.vercel.app/evidence/final-run.json>
- Real generated artifact: <https://draft-pay-web.vercel.app/evidence/artifacts/1245abd45b6136b7fb8b201fbbef4a542d116eaf6e63eb01a28dc5a167a9aa33.html>
- Repository: <https://github.com/openai-lover/DraftPay>

The evidence JSON is the canonical index for every submission, evaluation, payout, address, content hash, payment receipt, and ArcScan URL.

## Requirement coverage

| Requirement           | Implementation                                                                                          | Public proof                                                                               | Honest boundary                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| Arc Testnet           | Chain `5042002` assertion; isolated contest contracts; direct state and receipt reads                   | Factory plus winner/no-winner contests and ArcScan transactions                            | Testnet-only, unaudited                                 |
| USDC escrow           | Exact five-USDC funding pull per contest                                                                | Funding and terminal payout receipts                                                       | No mainnet or custody claim                             |
| Agent decision        | Three-stage pre-quote, post-quote, and post-analysis economics                                          | Stored `participate` decision and measurable inputs                                        | Explicitly triggered, not a continuous watcher          |
| Agent wallet          | Dedicated low-balance EOA signs x402 and Arc proof writes                                               | Payer and builder addresses in public evidence                                             | Circle Gateway buyer path currently uses an EOA         |
| x402                  | Public Circle Gateway seller; origin and spend policy; real 0.01-USDC settlement                        | Receipt ID `8f97cd76-cfd1-404a-8bec-5c036e8ae6f2`; seller returns HTTP 402 without payment | Gateway receipt ID rather than a fabricated tx hash     |
| Artifact generation   | DraftPay deterministic builder consumes the paid brief analysis                                         | Real-mode artifact metadata and public HTML bytes                                          | Deterministic builder, not claimed to be an LLM         |
| Verification          | Static hard gates plus real Chromium render, CTA, form, mobile overflow, and persistent hash uniqueness | 12/12 checks stored with artifact                                                          | Static HTML category only                               |
| Proof submission      | Keccak content hash and retrievable URI written by builder                                              | Six successful Arc submission transactions                                                 | Two prepared secondary finalists remain labeled fixture |
| Evaluation            | Evaluator-only qualification and ranking with evidence hashes                                           | Three qualification writes and one ranking write per contest                               | Central evaluator; no quorum/disputes                   |
| Winner settlement     | Client may select only a ranked finalist; 95% plus 5% finalist pool                                     | Successful winner ArcScan receipt and `4.75 + 0.125 + 0.125 = 5.00`                        | Client choice remains subjective                        |
| No-winner settlement  | Ranked effort receives 15/10/5; 70% returns to client                                                   | Successful ArcScan receipt and `0.75 + 0.50 + 0.25 + 3.50 = 5.00`                          | No dispute process                                      |
| Zero-qualified refund | Full prize returns when nobody qualifies                                                                | Earlier successful five-USDC refund transaction                                            | Separate real terminal branch                           |
| Conservation          | Atomic integer math; bounded three-recipient payout set                                                 | Onchain payout arrays plus Foundry fuzz tests                                              | Not formally verified                                   |
| Public deployment     | Next.js app and Node x402 service deployed separately                                                   | Both URLs load without authentication                                                      | Hobby/Testnet deployment                                |

## Exact live run

- Factory: `0x15933a0368787066dF3cF2f0155Eb978dc143828`
- Winner contest: `0xA5aD6018afd517429C64469cC2dFFE09c5f1853a`
- Finalist no-winner contest: `0xeF753F526B4fbB39b4913eAfc7dE5C85471F7e49`
- Agent/builder: `0xF601Fbf9F28CC12794044DBE481A692957Dde832`
- Evaluator: `0xaA21cB00255494188298998885f98E411d911370`
- Real artifact hash: `0x1245abd45b6136b7fb8b201fbbef4a542d116eaf6e63eb01a28dc5a167a9aa33`
- Winner-path submission: <https://testnet.arcscan.app/tx/0x09ade04f8ba31208b52b4cd7ec9c64e237bdc402988e94ad9e88c1f44cdbac42>
- No-winner-path submission: <https://testnet.arcscan.app/tx/0x8f3bd833f0573ff261511f5e0feaf6846a328d4833e57da8fe483ee5610a0826>
- Winner settlement: <https://testnet.arcscan.app/tx/0x1ecbdd4ebe4819e187f6928ac7474d8c03406bc2840a8175c1293346bf2d6906>
- Finalist-bearing no-winner settlement: <https://testnet.arcscan.app/tx/0x5a00874bacb95b830d43738c67cd5722707d3f152c6d39b9a71e32c5d34c68a5>
- Earlier zero-qualified refund: <https://testnet.arcscan.app/tx/0xc2526124286edfb50400cd1f969fec007388efc9969ad90c507319c94e60f2a7>

## Local verification snapshot

- Foundry: 28 passing contract tests, including winner/no-winner conservation fuzz runs and finalist-cap boundaries.
- TypeScript unit/integration: 61 passing tests across shared, agent, web, and x402 service packages.
- Playwright: 10 passing desktop/mobile journeys, including the final live-proof timeline.
- Strict TypeScript, ESLint, Prettier, Solidity formatting, contract build, and Next.js production build pass in the final repository state.

Run the current suite rather than trusting prose:

```bash
pnpm contracts:test
pnpm test:unit
pnpm test:integration
pnpm lint
pnpm typecheck
pnpm test:e2e
pnpm build
```

## Explicit stretch status

Submission bonds, ERC-8004 identity, continuous contest discovery, custom chain indexing, evaluator quorum, disputes, arbitrary repository execution, and production authentication remain out of scope. None are presented as judge evidence.

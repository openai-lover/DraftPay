# DraftPay

[![Quality Gate](https://github.com/openai-lover/DraftPay/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/openai-lover/DraftPay/actions/workflows/quality.yml)

**Post a brief. Agents build. Programmable money pays fairly.**

DraftPay is a focused Arc Testnet contest MVP for responsive landing pages. A client escrows test USDC, builders submit content-addressed work, a deterministic evaluator qualifies and ranks up to three finalists, and the contest settles either with a selected winner or with a transparent Effort Protection Pool.

This is unaudited, Testnet-only hackathon software—not a production escrow, custody, or security product.

## Hackathon pitch

- [Public DraftPay app](https://draft-pay-web.vercel.app)
- [Judge Proof Room](https://draft-pay-web.vercel.app/proof)
- [Live Arc health proof](https://draft-pay-web.vercel.app/api/health)
- [Public Circle Gateway x402 service health](https://draft-pay-x402-service.vercel.app/health)
- [Machine-readable live execution evidence](https://draft-pay-web.vercel.app/evidence/final-run.json)
- [Winner settlement on ArcScan](https://testnet.arcscan.app/tx/0x1ecbdd4ebe4819e187f6928ac7474d8c03406bc2840a8175c1293346bf2d6906)
- [Finalist-bearing no-winner settlement on ArcScan](https://testnet.arcscan.app/tx/0x5a00874bacb95b830d43738c67cd5722707d3f152c6d39b9a71e32c5d34c68a5)

- [Google Slides — DraftPay Programmable Money Hackathon Pitch](https://docs.google.com/presentation/d/1JdKbG6eIMx2CiGI-eaKfxeOxGPzBGC83NoZ4z45YU2c)
- [Editable PowerPoint source](docs/DraftPay-Hackathon-Pitch.pptx)

## The nine judge questions

### 1. What problem does DraftPay solve?

Most outcome marketplaces force either the client or the builder to take all the risk. DraftPay lets the client compare completed work before selecting while making every terminal payout rule visible in advance. Invalid or duplicate work receives nothing.

### 2. Why is Arc necessary?

Arc and the Arc USDC ERC-20 interface enforce exact escrow, deadlines, qualifications, bounded rankings, terminal state transitions, refunds, and recipient amounts. The web or agent server cannot redirect the prize.

### 3. What does the autonomous agent decide?

The Builder Agent reads the pinned contest directly from Arc and checks its approved metadata hash. It evaluates category support, open state, prize, time remaining, generation and verification costs, x402 price, qualification probability, required tools, expected value, request/session/daily spend limits, service origin, and emergency pause. It stores concise reasons and measurable inputs, not hidden chain-of-thought.

The decision runs three times, and the purchased analysis is what separates the second from the third:

| Stage         | What changes                                                                                                                        |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Pre-quote     | Screens the contest before spending anything, including a quote request.                                                            |
| Post-quote    | Re-decides against the advertised x402 price. An over-limit quote means it never pays.                                              |
| Post-analysis | Recalibrates the qualification prior from the analysis it bought and replaces its own build-cost guess with the purchased estimate. |

On the seeded contest that reads:

```text
before paid analysis   72.00% qualification   80000 build cost   68.26 USDC expected value
after  paid analysis   64.50% qualification  110000 build cost   61.105 USDC expected value
  -450 bps  paid analysis risk score 18
  -300 bps  paid analysis complexity medium
```

If the purchased analysis destroys the economics, the agent abandons the contest after paying, records `abandonedAfterPaidAnalysis: true`, and never invokes the generator. A purchase that can only ever confirm the prior is not a decision.

### 4. Where does USDC move?

- Client → contest: the exact prize during `fund`.
- Contest → selected winner and other finalists: 95% to the winner; the remaining 5% split equally across the other payout-eligible finalists. With one finalist, the winner receives 100%.
- Contest → ranked builders and client when no winner is selected: 15% / 10% / 5% to ranks one through three; every unused share returns to the client. The client therefore receives 70% with three finalists, 75% with two, 85% with one, and 100% when nobody qualifies.
- Contest → client when nobody qualifies: 100% refund.

All values use the Arc USDC ERC-20 interface at `0x3600000000000000000000000000000000000000` with 6 decimals. Prize conservation is tested in atomic units.

### 5. Where is Circle Agent Stack used?

`apps/agent/src/x402-client.ts` uses Circle's Gateway x402 buyer client with a server-only, low-balance agent EOA. `apps/x402-service/src/app.ts` uses Circle Gateway middleware to sell brief-risk analysis on Arc Testnet. The EOA limitation is explicit because this Nanopayment path does not use a smart-contract account.

### 6. Where is x402 used?

The Builder Agent calls `POST /x402/brief-analysis`. In real mode it receives the HTTP 402 requirements, validates price and origin against policy, authorizes an Arc USDC Nanopayment through Circle Gateway, retries, validates the paid response, and stores the payment ID as evidence.

Fixture mode quotes the same advertised price the seller charges (`10000` atomic, $0.01) so the participation decision is genuinely priced, while recording `paymentOccurred: false` and `amountAtomic: "0"` because nothing settled. Both modes report `quotedAmountAtomic` alongside the settled amount.

### 7. How can judges reproduce the demo?

```bash
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm demo:seed
pnpm demo:run
pnpm dev
```

Open `http://localhost:3000`, then use Explore → contest → Compare for the winner and no-winner previews. Open Agent Activity and click **Run Builder Agent**. The zero-credential path is explicitly labeled `Fixture` and never fabricates a transaction or payment.

### 8. What is real and what is fixture?

- `real` means a successful Arc receipt or a settled Circle Gateway payment produced and verified at runtime.
- `fixture` means deterministic local data prepared for a reliable judge path. Fixture addresses are actors only; fixture receipts are rule previews; `paymentOccurred` is false.
- Real evidence includes the deployed factory, public web and x402 services, a settled Circle Gateway x402 purchase, a fresh deterministic-agent artifact that passed live Chromium verification, six onchain proof submissions, evaluator qualification/ranking writes, and both winner and finalist-bearing no-winner settlements. Prepared secondary finalists remain explicitly labeled `fixture`; they are never presented as generated-agent output.

### 9. What remains stretch?

Submission bonds, ERC-8004 identity, continuous factory discovery, a custom chain indexer/database, disputes, evaluator quorum, arbitrary repository execution, and production authentication are deliberately outside the primary MVP. They are not presented as implemented.

## Implemented

- Foundry factory and isolated contest escrow with an explicit state machine.
- Unbounded qualification with a bounded payout set: any submission may be evaluated and marked qualified, while only the first three become finalist-eligible. The evaluator never has to reject valid work to keep a transaction from reverting.
- Exact winner, no-winner, and no-qualified payout paths with permissionless expiry settlement.
- Contract unit, invariant-style conservation fuzz, fee-on-transfer, and reentrancy tests.
- Next.js product with landing, explore, create/fund, contest detail, agent activity, three-way comparison, verified receipt, and agent profile surfaces.
- wagmi/viem wallet actions for factory create, USDC approval, funding, winner selection, and no-winner settlement.
- Direct contract reads for all decision and settlement authority; no custom blockchain indexer.
- Deterministic specification parsing, builder economics, static-artifact verification, proof submission, evaluator writes, and real/fixture model adapters.
- Circle Gateway x402 seller and buyer adapters with request/session/daily limits, allowlisted origin, and emergency pause.
- Append-only local JSONL evidence and immutable content-addressed artifact files with a sandboxed preview endpoint.
- Receipt verification before the UI labels transaction evidence real.
- One-time client-wallet signature gate for releasing selected winner source after verified settlement.
- Judge-facing Proof Room with live Arc chain, USDC, and Circle Gateway bytecode checks.
- MetaMask mobile QR and injected-wallet connection paths, Arc network switching, and Circle faucet access.
- Three-job GitHub quality gate for application checks, browser journeys, and Foundry security tests.

## Repository map

```text
apps/web             Next.js UI and server routes
apps/agent           decision, generation, verification, x402 buyer, Arc submit/evaluate
apps/x402-service    Circle Gateway protected brief-analysis seller
packages/contracts   Solidity, Foundry tests, Arc deployment script
packages/chain       Arc config, ABIs, receipt and explorer helpers
packages/shared      Zod schemas, exact-USDC math, domain types, fixtures
packages/ui          reusable UI primitives
scripts              deterministic seed/reset and fixture demo runner
docs                 architecture, threat model, deployment, and judge assets
```

## Commands

| Command                     | Purpose                                                     |
| --------------------------- | ----------------------------------------------------------- |
| `pnpm dev`                  | Start the web application                                   |
| `pnpm x402`                 | Start the paid analysis service                             |
| `pnpm agent`                | Run the Builder Agent once                                  |
| `pnpm demo:seed`            | Generate exact fixture evidence and hashes                  |
| `pnpm demo:reset`           | Remove generated fixture evidence                           |
| `pnpm demo:run`             | Decision → fixture x402 → artifact → hash → verification    |
| `pnpm agent:evaluate:arc`   | Qualify and rank submissions with evaluator credentials     |
| `pnpm contracts:deploy:arc` | Deploy the factory with a Foundry keystore account          |
| `pnpm web:deploy`           | Deploy the linked monorepo web project to Vercel production |
| `pnpm lint`                 | ESLint plus Solidity format check                           |
| `pnpm quality`              | Lint, typecheck, application tests, and production builds   |
| `pnpm contracts:lint`       | Fail on high-severity Foundry lint findings                 |
| `pnpm typecheck`            | Strict TypeScript checks                                    |
| `pnpm test:unit`            | Shared, agent, and web unit suites                          |
| `pnpm test:integration`     | x402 service integration suite                              |
| `pnpm contracts:test`       | Foundry unit and fuzz tests                                 |
| `pnpm test:e2e`             | Desktop and mobile Playwright journeys                      |
| `pnpm build`                | Production builds/checks for all packages                   |

For a real run, use [setup](docs/SETUP.md), then follow the exact [Arc and web deployment sequence](docs/DEPLOYMENT.md). The [verification guide](docs/VERIFICATION.md) maps claims to executable checks, and honest boundaries are listed in [known limitations](docs/KNOWN_LIMITATIONS.md).

## Official references

- [Arc connection reference](https://docs.arc.io/arc/references/connect-to-arc)
- [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses)
- [Arc ERC-8183 quickstart](https://docs.arc.io/arc/tutorials/create-your-first-erc-8183-job)
- [Circle Gateway Nanopayments](https://developers.circle.com/gateway/nanopayments)
- [Circle x402 seller quickstart](https://developers.circle.com/gateway/nanopayments/quickstarts/seller)
- [Vercel monorepo deployment](https://vercel.com/docs/monorepos)
- [ERC-8183 specification](https://eips.ethereum.org/EIPS/eip-8183)

License: hackathon prototype; no production warranty.

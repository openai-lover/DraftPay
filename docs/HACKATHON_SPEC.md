# DraftPay Hackathon Specification

Status: implementation baseline
Last updated: 2026-07-21

## Product thesis

DraftPay is an Arc Testnet contest marketplace for one focused category: responsive landing-page design and development. A client publishes an approved structured brief, escrows test USDC, and compares working submissions. A deterministic verifier qualifies at most three finalists. The client either selects a winner or rejects all qualified work; if the deadline expires, anyone may execute the no-winner settlement.

**Tagline:** Post a brief. Agents build. Programmable money pays fairly.

This MVP proves two claims:

1. an autonomous builder can make an explicit, budget-constrained economic decision, buy a useful x402 service, prepare a deliverable, and submit its hash; and
2. Arc can enforce escrow, deadlines, refunds, and bounded multi-recipient USDC settlement without relying on the web server to move contest funds.

## Demo acceptance criteria

### Winner path

1. Connect a wallet on Arc Testnet and approve a structured landing-page specification.
2. Create a contest contract, approve the USDC ERC-20 interface, and fund exactly 100 USDC.
3. Show real transaction hashes, the contract address, and ArcScan links.
4. Run the Builder Agent and display measurable decision inputs and its participate/skip result.
5. When credentials are configured, complete a genuine Circle Gateway Nanopayments x402 request; otherwise label the local adapter as a fixture.
6. Prepare a safe static deliverable, compute its hash, and submit the proof onchain.
7. Verify and compare three submissions.
8. Select a qualified winner before the selection deadline.
9. Settle 95 USDC to the winner and 5 USDC among up to two other qualified finalists. Give any unused finalist allocation to the winner.
10. Display the confirmed receipt, event summary, exact recipients, and ArcScan evidence.

### No-winner path

1. Use a separate contest with up to three ranked qualified submissions.
2. Let the client reject all or wait until the selection deadline so any account can settle.
3. For a 100 USDC prize, refund 70 USDC to the client and pay ranks 1/2/3 exactly 15/10/5 USDC.
4. If ranks are absent, refund their unused allocation to the client.
5. Display the confirmed receipt and ArcScan evidence.

### No-qualified path

Once evaluation closes with zero qualified submissions, refund the entire prize to the client. Empty, duplicate, broken, malicious, and otherwise invalid submissions receive nothing.

## Exact settlement rules

All prize amounts use 6-decimal USDC integers. Solidity basis points are used only with integer division.

| Outcome      | Recipient                 | Formula                                                                  |
| ------------ | ------------------------- | ------------------------------------------------------------------------ |
| Winner       | selected winner           | `prize * 9500 / 10000`, plus rounding and any unused finalist allocation |
| Winner       | 1–2 non-winning finalists | `(prize - baseWinner) / finalistCount` each                              |
| No winner    | rank 1                    | `prize * 1500 / 10000`                                                   |
| No winner    | rank 2                    | `prize * 1000 / 10000`                                                   |
| No winner    | rank 3                    | `prize * 500 / 10000`                                                    |
| No winner    | client                    | `prize - sum(actual ranked payouts)`                                     |
| No qualified | client                    | entire prize                                                             |

Remainders always stay inside the original prize conservation equation. No builder deposit or submission bond participates in the primary MVP accounting.

## Autonomous Builder Agent

The Builder Agent reads category, prize, time remaining, generation cost, verification cost, expected qualification probability, session spend, and available tools. It records concise facts rather than hidden reasoning.

`expectedValue = estimatedReward * qualificationProbability - generationCost - verificationCost - x402Cost`

It participates only when the category is supported, time is sufficient, expected value clears the configured threshold, costs fit per-request/session/daily budgets, the service domain is allowlisted, all required tools exist, and emergency pause is off.

## Stretch boundary

Submission bonds are intentionally deferred. The primary acceptance criteria require exact prize escrow and both terminal outcomes first; the contract and UI do not present a bond as implemented.

## Verification boundary

Hard checks run before any optional rubric score: non-empty artifact, required text and sections, CTA, form, safe scripts, no duplicate content hash, loadable prepared preview, and a deterministic static mobile-CSS guard. A failed hard check cannot be overridden by an AI score. Runtime viewport overflow remains a manual or browser-E2E verification item; the app does not claim it was measured when it was not. The client, not the verifier, selects the winner.

## Real and fixture modes

- `real`: wallet signatures, contract transactions, x402 payment authorization, and receipts must come from configured Arc/Circle services.
- `fixture`: deterministic contest metadata, prepared screenshots, static deliverables, agent decisions, and mock x402 responses are clearly labeled and are used for local development and automated tests.
- Fixture records never contain fabricated transaction hashes, deployment addresses, ArcScan links, or claims of payment.

## Verified Arc configuration

Verified against official documentation on 2026-07-21:

| Item                               | Value                                        |
| ---------------------------------- | -------------------------------------------- |
| Chain                              | Arc Testnet only                             |
| Chain ID                           | `5042002` (`0x4CEF52`)                       |
| RPC                                | `https://rpc.testnet.arc.network`            |
| WebSocket                          | `wss://rpc.testnet.arc.network`              |
| Explorer                           | `https://testnet.arcscan.app`                |
| USDC ERC-20 interface              | `0x3600000000000000000000000000000000000000` |
| USDC ERC-20 decimals               | `6`                                          |
| Native gas asset                   | USDC, native precision `18`                  |
| ERC-8183 AgenticCommerce reference | `0x0747EEf0706327138c69792bF28Cd525089e4583` |

Arc exposes one underlying USDC balance through a native gas view and an ERC-20 view. DraftPay reads, approves, transfers, stores, and displays contest amounts exclusively through the 6-decimal ERC-20 interface. It never adds the two views or presents them as separate assets.

Sources: [Connect to Arc](https://docs.arc.io/arc/references/connect-to-arc), [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses), [ERC-8183 quickstart](https://docs.arc.io/arc/tutorials/create-your-first-erc-8183-job), [Circle Nanopayments](https://developers.circle.com/gateway/nanopayments), [Circle x402 seller quickstart](https://developers.circle.com/gateway/nanopayments/quickstarts/seller), [ERC-8183](https://eips.ethereum.org/EIPS/eip-8183).

## Persistence boundary

Arc remains the source of truth and is read directly before decisions or writes. Append-only local JSONL stores public demo evidence, while content-addressed files store exact generated artifact bytes. The MVP deliberately has no custom blockchain indexer, database, or complex persistence infrastructure.

## Non-goals and stretch goals

No mainnet, custody system, arbitrary repository execution, general-purpose job categories, disputes, upgradeability, governance, staking, or production security claim. Submission bonds, continuous contest discovery, custom indexing/database infrastructure, distributed locks, object storage/screenshot workers, and ERC-8004 identity remain deferred.

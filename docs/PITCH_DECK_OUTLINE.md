# Pitch Deck Outline

## 1. Outcome work has a trust mismatch

- Buyers want proof before payment.
- Builders and agents need confidence that valid effort is not free labor.
- Traditional platforms add custody, subjective disputes, and opaque fees.

Visual: one brief branching to three working products, then deterministic payout rules.

## 2. DraftPay

**Post a brief. Agents build. Programmable money pays fairly.**

- Structured brief approved before funding.
- Humans and autonomous agents compete with working artifacts.
- Deterministic verification gates quality.
- Client chooses the winner; Arc settles.

## 3. The autonomous economic loop

`Discover → Evaluate EV → Buy x402 tool → Build → Verify → Commit hash → Earn USDC`

Show the exact signals and spend-policy checks. Emphasize that concise decision evidence replaces unverifiable “agent” claims.

## 4. Programmable settlement

Winner: `95 / 2.5 / 2.5` for three finalists.

No winner: `70 / 15 / 10 / 5`.

No qualified: `100% refund`.

## 5. Why Arc and Circle

- Arc USDC is both the economic asset and native gas environment.
- Per-contest contracts enforce deadlines and bounded payouts.
- ArcScan exposes every funding, proof, evaluation, and settlement event.
- Circle Gateway lets an agent buy a useful x402 resource in the same USDC economy.

## 6. Trust-minimized core, explicit centralized edges

Onchain: escrow, eligibility-dependent recipients, settlement math, finality.

Offchain: specification parser, prepared artifacts, deterministic verifier, append-only evidence, evaluator key.

Future: evaluator attestations/committee, immutable artifact storage, ERC-8004 identity, dispute mechanism.

## 7. Product

Use only three screenshots:

1. create/specification approval and funding receipts;
2. three-way working-product comparison;
3. verified payout receipt with ArcScan evidence.

## 8. Engineering evidence

- Foundry unit and conservation fuzz tests, including reentrancy resistance.
- strict TypeScript and Zod boundaries.
- real/fixture evidence types are structurally distinct.
- Circle seller/buyer adapters and wallet policy.
- append-only local decision/payment/proof evidence; settlement state read directly from Arc.
- desktop/mobile Playwright flows included.

## 9. Market wedge

Start with constrained, objectively testable front-end products. Expand only when verification can stay legible: design systems, email templates, data transformations, and other bounded digital deliverables.

Potential revenue: contest creation fee or settlement protocol fee, introduced only after security review; the hackathon MVP takes none.

## 10. Ask / next milestones

- Complete public Arc/Circle evidence run.
- Independent contract review and property testing.
- Decentralize evaluation and register agent identity.
- Pilot with teams already commissioning small product experiments.

# DraftPay — Hackathon Project Description

## One line

Post a brief. Agents build. Programmable money pays fairly.

## Submission description

DraftPay is an Arc Testnet contest marketplace for outcome-based software work. A client approves a structured build specification, escrows USDC, and compares working submissions from autonomous AI agents and human vibe coders. A deterministic evaluator admits no more than three qualified finalists, but the client retains the final product choice.

Arc is the economic engine rather than a decorative ledger. Each isolated contest contract enforces exact USDC funding, deadlines, bounded finalist ranking, and terminal settlement. Selecting a winner pays 95% to the winner and divides 5% among up to two other qualified finalists. Rejecting every qualified result—or missing the selection deadline—refunds unused prize and pays a ranked 15/10/5 Effort Protection Pool. With no qualified work, the prize is fully refunded.

The Builder Agent reads and verifies contest economics directly from Arc, decides whether expected value justifies participation, and applies request/session/daily spending limits. In credentialed mode it buys brief-risk analysis through Circle Gateway Nanopayments/x402, generates and hard-verifies a responsive artifact, stores its exact bytes, and submits the content hash plus retrievable proof URI onchain. Fixture mode is structurally separate and never invents a payment or transaction.

The application includes all eight judge-facing screens, a three-way product comparison, direct Arc receipt verification, local append-only evidence, and Foundry conservation fuzzing. Submission bonds, custom indexing/database infrastructure, and ERC-8004 identity are explicit stretch work.

## Track fit

- **Agentic Economy:** explicit profit decision, agent-controlled wallet, x402 USDC tool purchase, deliverable proof, and settlement.
- **DeFi / Programmable Money:** USDC escrow, deadline state machine, conditional multi-recipient payouts, automatic refund, and Effort Protection Pool.

## Evidence status

Local implementation gates and exact current verification results are recorded in `JUDGING_MAP.md`. Real Arc deployment, settlement transactions, Circle payment ID, and hosted URL remain pending the external funded wallets/accounts documented in `KNOWN_LIMITATIONS.md`.

# Three-Minute Judge Demo

Use two pre-funded Arc Testnet contests. Keep ArcScan tabs ready, but do not display fixture receipts as transactions.

## 0:00–0:20 — Thesis

Show the landing page.

> DraftPay turns a build brief into programmable USDC. A client compares working products; agents decide whether the economics make sense; Arc guarantees the payout rules.

Point to: **Brief → Build → Verify → Select → Settle**.

## 0:20–0:50 — Create and fund

Open **Post a contest**.

1. Show the natural-language Ledgerly brief and 100 USDC prize.
2. Generate structured requirements.
3. Explain that the client must approve this deterministic specification before funding.
4. Connect the client wallet on Arc Testnet.
5. Approve the specification, create the contest, approve USDC, and fund.
6. Open one successful ArcScan transaction from the on-screen list.

> The contract holds the exact prize. DraftPay's server cannot redirect it.

## 0:50–1:25 — Autonomous agent and x402

Open **Agent activity** and click **Run Builder Agent**. Leave the operator token blank for the harmless fixture path; for a configured real path, enter the server-configured operator token. Narrate only displayed facts:

- supported category;
- 100 USDC prize;
- generation/verification/x402 costs;
- qualification probability and expected value;
- time remaining, required tools, daily wallet budget;
- participate decision.

Show the real paid-tool evidence badge and Circle payment/receipt ID only if `X402_MODE=real` completed successfully.

> The agent first discovers the x402 price, checks its request/session/daily policy and allowlist, authorizes a real Arc USDC Nanopayment through Circle Gateway, then receives brief-risk analysis. It never calls the paid tool in fixture mode and claims no payment there.

Show the deliverable hash and confirmed `SubmissionSubmitted` Arc transaction.

## 1:25–2:15 — Compare and winner settlement

Open the three-way comparison.

1. Switch among the large previews.
2. Point to deterministic checks, score, cost, delivery time, and exact content hash.
3. Explain that hard failures cannot be rescued by an AI score.
4. Select Northstar as the winner with the client wallet.
5. On the verified receipt show:
   - 95 USDC winner;
   - 2.5 USDC to each other finalist;
   - successful finality, block, contract, events, and ArcScan link.

> Client choice decides quality; code decides money. Settlement is terminal and the full source package can now be released.

## 2:15–2:50 — Effort Protection Pool

Switch to the second contest after its selection deadline. Connect any Arc wallet and press **Execute permissionless no-winner settlement**.

Show the verified receipt:

- 70 USDC client refund;
- 15 / 10 / 5 USDC ranked qualified rewards;
- `SettledWithoutWinner` state and `NoWinnerSettled` event;
- ArcScan confirmation.

> Qualified effort is protected, but invalid or duplicate work receives nothing. Missing ranks return their unused allocation to the client.

## 2:50–3:00 — Close

> This is not wallet login around a normal marketplace. Arc enforces escrow, deadlines, refunds, and multi-party settlement; Circle gives the agent paid tools; the agent decides whether participating is economically rational.

## Failure-safe presentation rules

- If a wallet rejects a transaction, show the designed rejected state; never navigate to a success receipt.
- If real x402 credentials are unavailable, state that the activity is a fixture and show `paymentOccurred: false`.
- If an RPC is unavailable, use the prepared rule preview but call it a preview—not transaction evidence.
- Use two contracts; never try to replay a terminal settlement.

# Three-Minute Submission Video

The automated recording uses the deployed app, the generated artifact, and live ArcScan pages. It never displays a private key, wallet prompt, or seeded receipt.

## 0:00-0:16 — The product

Visual: public landing hero.

Voiceover: “DraftPay is an outcome-based build contest on Arc. A client posts a funded brief, humans and autonomous agents ship working products, and one contract pays every terminal outcome in USDC.”

## 0:16-0:34 — The proof chain

Visual: public verifiable-execution timeline.

Voiceover: “The demo is one linked execution: the agent reads the contest, decides whether entering is profitable, buys one useful analysis through x402, generates and verifies an artifact, submits its hash, and receives an onchain outcome.”

## 0:34-0:56 — The artifact

Visual: the real content-addressed Ledgerly artifact.

Voiceover: “This page is not the prepared fixture. DraftPay's deterministic builder generated it after the paid analysis. Headline, sections, CTA, form, accessibility, script safety, uniqueness, and a real 390-pixel Chromium render all passed before submission.”

## 0:56-1:16 — The submission

Visual: ArcScan proof-submission transaction.

Voiceover: “The builder wallet binds the Keccak content hash and a retrievable public URI to the Arc contest. The app server cannot replace the artifact or redirect the prize.”

## 1:16-1:35 — Evaluation

Visual: ArcScan finalist-ranking transaction.

Voiceover: “After the deadline, the evaluator records three qualified submissions and their ranking. It can enforce the public hard checks, but it cannot select the winner or move escrow anywhere else.”

## 1:35-2:00 — Winner branch

Visual: winner settlement on ArcScan.

Voiceover: “In the winner branch, the client selects qualified submission one. The contract immediately pays 4.75 USDC to the winner and 0.125 to each other finalist. Five USDC enters and exactly five leaves.”

## 2:00-2:25 — No-winner branch

Visual: finalist-bearing no-winner settlement on ArcScan.

Voiceover: “In the second contest, the client selects nobody. That does not erase verified effort: ranks one, two, and three receive fifteen, ten, and five percent, while seventy percent returns to the client.”

## 2:25-2:55 — Public evidence

Visual: public evidence JSON, then final landing frame.

Voiceover: “Every address, artifact, payment receipt, submission, evaluation, and payout is public and linked from one judge packet. DraftPay makes agent decisions legible and programmable-money outcomes enforceable. Post a brief. Agents build. Arc pays fairly.”

## Recording command

After the final production deployment:

```bash
node node_modules/tsx/dist/cli.mjs scripts/record-demo-video.ts
```

The command writes `outputs/DraftPay-3min-demo.webm`. The eight live shots target about 160 seconds; navigation time brings the finished recording close to three minutes.

## Final checks

- Confirm the public production app and artifact load without authentication.
- Confirm both settlement pages show successful Arc transactions.
- Keep fixture labels visible for the two prepared secondary finalists.
- Never show `.env.local`, wallet secrets, Vercel settings, or unrelated tabs.
- Upload the resulting WebM as an unlisted/public video and verify it in a signed-out window.

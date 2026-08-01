# Arc Testnet and Web Deployment

Dedicated Testnet-only EOAs are funded. The factory and two 5-USDC contests are deployed on Arc Testnet. The builder deposited 1 USDC into Circle Gateway and completed a settled 0.01-USDC x402 request. The first no-winner contest completed the zero-submission 5-USDC refund path. Onchain artifact submission, evaluator writes, winner/finalist settlement, and public hosting remain pending. Record evidence only after each receipt or deployment succeeds.

Current checked evidence:

- Factory: `0x15933a0368787066dF3cF2f0155Eb978dc143828`
- Factory deployment: `0xbb9239676824ef171e05e7e0faeaf3d98b3596dc477a5277610635b2c7846e59`
- Gateway approval: `0x3860d2bb5e8ac7db1b783a0fd7c0249e462952fc45bab6f496a15f17a72fafa4`
- Gateway deposit: `0x1fc82cc597d262031ddfcb8fb720f285158225bc4835dc3b7a80f24e3d95223a`
- Winner contest: `0x147730a13e8E2b0b32596546B02C8918C5324E64`
- Winner funding: `0x19d87288d8ad9f8e152eec50d15fcfdce24307ef2c7e868de7db183da06b8b5d`
- No-winner contest: `0x57FE6700Cb29b57308162B153E4C543E547dcf87`
- No-winner funding: `0x50b08441ebe123422b12da829c80842a46c9306fa43c2e035537ae7aa4da2ff6`
- Zero-submission refund settlement: `0xc2526124286edfb50400cd1f969fec007388efc9969ad90c507319c94e60f2a7`
- Settled x402 payment ID: `f4a38cc3-320a-45e8-bff0-30292fc1059f`

Read-only verification on 2026-07-21 confirmed Arc Testnet chain ID `5042002`, the USDC interface at `0x3600000000000000000000000000000000000000`, and 6 token decimals. Re-check official Arc documentation immediately before a write.

## 1. Prepare the deployer

| Field     | Value                             |
| --------- | --------------------------------- |
| Network   | Arc Testnet                       |
| RPC       | `https://rpc.testnet.arc.network` |
| Chain ID  | `5042002`                         |
| Explorer  | `https://testnet.arcscan.app`     |
| Gas asset | USDC, native view                 |

Provision dedicated Testnet-only deployer, builder, and evaluator EOAs. Generated keys are written only to the ignored `.env.local` file and are never printed:

```bash
pnpm wallets:provision:testnet
pnpm arc:check
```

Request Arc Testnet USDC for the printed addresses from the Circle Faucet. The public faucet currently sends 20 USDC per address every two hours.

## 2. Deploy the factory

```bash
pnpm arc:deploy:factory
```

The script deploys only `DraftPayContestFactory`, pins the verified Arc USDC interface, verifies resulting bytecode, updates the ignored local environment, and records non-secret evidence under `.demo/arc-deployment.json`.

## 3. Create and fund contests

Set:

```dotenv
NEXT_PUBLIC_DRAFTPAY_FACTORY_ADDRESS=0x...
NEXT_PUBLIC_DEMO_EVALUATOR_ADDRESS=0x...
```

Run `pnpm dev`, connect the client wallet to Arc Testnet, approve the specification, and create the contest. The UI submits factory creation, exact USDC approval, then funding; each receipt must succeed.

Download the approved metadata JSON and configure the resulting contest:

```dotenv
NEXT_PUBLIC_DEMO_CONTEST_ADDRESS=0x...
AGENT_SUBMIT_CONTEST_ADDRESS=0x...
AGENT_CONTEST_METADATA_PATH=/absolute/path/draftpay-contest-metadata.json
```

For the reproducible 5-USDC demo pair, run `pnpm arc:create:contests`. It creates and funds independent winner and no-winner contests and writes their exact approved metadata under `.demo/deployments` because settlement is final.

The default winner windows are two hours for submission and four hours for selection. The no-winner receipt path defaults to ten and twenty minutes so it can be completed during a live verification session. Override the four `ARC_*_WINDOW_SECONDS` values before creation when a longer rehearsal window is required.

## 4. Run the Builder Agent and evaluator

The builder EOA needs Arc gas. No submission bond is required.

```dotenv
AGENT_PRIVATE_KEY=0x...
AGENT_RUN_TOKEN=long-random-operator-token
AGENT_MAX_DAILY_SPEND_ATOMIC=5000000
AGENT_ARTIFACT_BASE_URL=https://your-web.example
```

Run `pnpm agent`, or configure `AGENT_CONTEST_METADATA_JSON` in the web environment, enter the operator token on Agent Activity, and click **Run Builder Agent**. The agent reads the pinned contest directly from Arc, validates the approved metadata hash, stores the verified artifact, and submits its content hash with a retrievable sandboxed URI.

After the submission deadline:

```dotenv
EVALUATOR_CONTEST_ADDRESS=0x...
EVALUATOR_PRIVATE_KEY=0x...
EVALUATION_INPUT_PATH=apps/agent/fixtures/evaluation-input.example.json
```

```bash
pnpm agent:evaluate:arc
```

The evaluator command checks the configured evaluator, deadline, hard verification results, and maximum of three finalists before writing.

## 5. Enable real Circle Gateway x402

```dotenv
X402_MODE=real
X402_SELLER_ADDRESS=0x...
X402_FACILITATOR_URL=https://gateway-api-testnet.circle.com
X402_SERVICE_URL=https://your-service.example/x402/brief-analysis
X402_ALLOWED_ORIGIN=https://your-service.example
```

Start `pnpm x402`, fund the agent's current Circle Gateway Testnet path, and run the agent. Label evidence real only when the buyer returns a settled payment ID and a paid response. The JSONL record must have `mode: "real"` and `paymentOccurred: true`.

```bash
pnpm gateway:check
pnpm gateway:deposit
```

For a public Vercel deployment, omit all deployer, builder, and evaluator private keys. Hosted
`/api/agent/run` requests fail closed unless `AGENT_RUN_TOKEN` is configured and supplied as a
Bearer token. The public judging app can therefore remain read-only while funded Testnet actions
run only from the local operator environment. The x402 seller service needs only the public seller
address; it never needs the seller wallet private key.

## 6. Execute both outcomes

- Winner contest: connect the client in Compare, select a qualified finalist, confirm the wallet action, and verify the Receipt page against ArcScan.
- No-winner contest: the client may reject all ranked finalists before the deadline; after the deadline any connected Arc wallet may call `settleNoWinner` from the detail page.

For every terminal contest, verify that the event recipients match the UI and the payout sum equals the original prize in atomic units.

## 7. Deploy the web app

The repository includes an explicit production command using Vercel's supported monorepo CLI path:

```bash
pnpm dlx vercel@latest login
pnpm dlx vercel@latest link --repo
pnpm web:deploy
```

Run link/deploy from the monorepo root. Choose `apps/web` as the Vercel project Root Directory and keep outside-root workspace sources enabled. Add the production environment variables in the linked Vercel project before the final deployment. The first command requires an interactive Vercel login; that is the exact external step this workspace cannot complete without the operator.

Deploy `apps/x402-service` separately to a Node-compatible host, then point `X402_SERVICE_URL` and `X402_ALLOWED_ORIGIN` at it and redeploy the web app.

## Verification checklist

- Chain ID is exactly 5042002.
- Factory and contest bytecode exist at displayed addresses.
- Contest token is the verified Arc USDC address and UI math uses 6 decimals.
- Funding balance equals the exact prize before submissions.
- Approved metadata hash matches `specificationHash`.
- x402 evidence contains a real settled payment ID only after payment.
- Terminal event recipients equal displayed payout rows and the prize sum is exact.
- Every ArcScan URL resolves to the same successful transaction shown in the UI.
- The public URL loads the winner and no-winner flows at desktop and 390px mobile width.

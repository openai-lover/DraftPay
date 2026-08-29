# Arc Testnet and Web Deployment

No deployment was executed in this workspace because no funded human-controlled Arc Testnet account, Circle Gateway balance, or hosting login was supplied. Record evidence only after each receipt or deployment succeeds.

Read-only verification on 2026-07-21 confirmed Arc Testnet chain ID `5042002`, the USDC interface at `0x3600000000000000000000000000000000000000`, and 6 token decimals. Re-check official Arc documentation immediately before a write.

## 1. Prepare the deployer

| Field     | Value                             |
| --------- | --------------------------------- |
| Network   | Arc Testnet                       |
| RPC       | `https://rpc.testnet.arc.network` |
| Chain ID  | `5042002`                         |
| Explorer  | `https://testnet.arcscan.app`     |
| Gas asset | USDC, native view                 |

Fund a dedicated Testnet deployer and import it into Foundry's encrypted keystore:

```bash
cast wallet import draftpay-deployer
```

## 2. Deploy the factory

```bash
export ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
pnpm contracts:deploy:arc
```

The script deploys only `DraftPayContestFactory`, pinned to the verified Arc USDC interface. Capture the address, successful transaction hash, block number, and ArcScan URL. Do not report an address until its receipt succeeds and `cast code <address>` returns bytecode on chain ID 5042002.

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

Create two independent contests for the two terminal demo outcomes because settlement is final.

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

Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin so canonical, Open Graph, robots, and sitemap URLs resolve to the public deployment.

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
- `/proof` loads and its live panel reports the expected chain, USDC, and Circle Gateway bytecode.
- `/api/health` returns `status: "ok"`; investigate any `network.status: "degraded"` result before judging live chain evidence.

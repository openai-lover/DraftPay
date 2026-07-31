# DraftPay MVP Threat Model

Last updated: 2026-07-21

## Scope and assumptions

DraftPay is an unaudited Arc Testnet hackathon MVP. Test USDC has no intended real-world value. The client signs its own transactions. The evaluator is trusted to apply documented deterministic checks, while the contract prevents it from redirecting funds or choosing a winner. Prepared demo artifacts are trusted inputs; arbitrary repositories are never executed.

## Assets

- Escrowed test USDC and the correctness of payout recipients.
- Client and agent signing keys.
- Circle/API/model credentials.
- Contest specification, deliverable hashes, evaluation evidence, and transaction provenance.
- UI integrity: real actions must not be confused with fixtures.

## Trust boundaries

1. Browser ↔ wallet: chain and transaction intent can be rejected or altered by the user.
2. Browser ↔ web API: all input is untrusted; secrets must not cross to the browser.
3. Web/agent ↔ x402 service: seller origin, price, network, and authorization must be validated.
4. Web ↔ preview: deliverable HTML and external links are hostile unless the artifact is a prepared fixture.
5. App ↔ Arc RPC: responses are checked against expected chain ID, receipts, addresses, and event signatures.
6. Evaluator ↔ contest: evaluator decisions are centralized but auditable and cannot define arbitrary payout addresses.

## Threats and controls

| Threat                                 | MVP control                                                                                                    | Residual risk                                                                   |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Wrong-chain or mainnet write           | wagmi configured for Arc Testnet; assert chain ID `5042002` before writes                                      | Wallet/RPC UX can still be confusing; UI shows network prominently              |
| Fake transaction evidence              | accept only a valid returned hash and successful receipt; derive ArcScan URL                                   | A malicious RPC can lie; judges should verify on ArcScan                        |
| Reentrancy or malicious token callback | immutable configured token, checks-effects-interactions, reentrancy guard                                      | Contract is unaudited                                                           |
| Double settlement                      | terminal enum state is set before transfers                                                                    | Token-level failure reverts the full transaction                                |
| Payout overflow/overpayment            | 6-decimal integers, bounded ranking, conservation tests                                                        | Rounding policy must remain documented                                          |
| Unauthorized winner                    | client-only check and winner must be ranked/qualified                                                          | Compromised client wallet remains decisive                                      |
| Evaluator confiscation/collusion       | no withdrawal ability, evidence hashes/events, max three qualified                                             | Evaluator can still misclassify or rank; no dispute mechanism                   |
| Duplicate deliverable                  | onchain hash map and offchain duplicate check                                                                  | Near-duplicate content is not detected cryptographically                        |
| Malicious submission/RCE               | never install, compile, or execute submissions; prepared assets only                                           | External preview URLs can change after verification                             |
| Preview XSS/navigation                 | prepared React previews only, CSP, no raw submitted/model HTML                                                 | Production external preview isolation is still required                         |
| Agent overspend                        | per-request/session/daily caps, allowlisted origin, emergency disable                                          | Daily state is process-local; compromised signer may spend outside the app      |
| x402 replay/forgery                    | official Circle scheme/middleware, bounded price and destination, store public evidence only                   | Depends on Circle Gateway and SDK correctness                                   |
| Secret exposure                        | ignored `.env`, server-only modules, env schema, no logging keys                                               | Hosting misconfiguration remains possible                                       |
| Fixture represented as real            | explicit `mode` badges; fixture hashes never shaped into fake tx records                                       | Presenters must follow demo script faithfully                                   |
| Premature/wrong source release         | one-time expiring signed challenge bound to wallet/contest/tx/artifact; verify client and WinnerSettled on Arc | Source is not secret to repository readers; nonce state is process-local        |
| Denial by missing evaluator action     | expired contests use bounded qualification-order fallback; no-qualified prize can refund                       | A negligent evaluator can prevent valid work from being qualified before expiry |
| Misleading local evidence              | explicit fixture/real mode, append-only records, real proof entries require successful receipts                | Local JSONL is not a canonical chain index                                      |
| Server signer triggered by web caller  | real web agent mode requires a server-only bearer token; fixture path is rate-limited                          | CLI remains the recommended real-agent path                                     |
| Malicious generated HTML               | size limit, deterministic script scan, exact hash, artifact response CSP sandbox                               | Static scan is not a complete HTML sanitizer                                    |

## Security tests

- unauthorized evaluation, ranking, winner selection, and cancellation revert;
- selection outside the deadline reverts;
- permissionless no-winner settlement before the deadline reverts;
- terminal settlement cannot repeat;
- invalid/duplicate ranking and invalid winner revert;
- token transfer reentrancy cannot enter guarded paths;
- fuzzed prizes conserve the full deposit across every terminal outcome;
- API schemas reject oversized or malformed inputs;
- x402 policy rejects high price, disallowed origin, exhausted budget, and pause mode.

## Explicit limitations

No audit, production custody, production authentication, formal verification, decentralized evaluator, dispute resolution, stable preview storage, compliance screening, or mainnet support. These are documented rather than implied.

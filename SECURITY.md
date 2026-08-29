# Security Policy

DraftPay is unaudited Arc Testnet software. Do not use real funds, production keys, or sensitive customer data.

## Reporting a vulnerability

Please use GitHub's private **Report a vulnerability** flow for this repository instead of opening a public issue. Include the affected component, reproduction steps, expected impact, and any suggested mitigation. Do not include private keys or wallet seed phrases.

## Current security boundaries

- Smart contracts are immutable and unaudited.
- The evaluator is a trusted role; evidence hashes and state transitions remain public.
- Circle Gateway real mode requires a dedicated low-balance server-side EOA.
- Agent request, session, and daily spending controls are process-local.
- Submitted repositories are never installed or executed.
- A UI item is labeled `real` only after runtime verification of an Arc receipt or settled Circle payment.

See [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) and [`docs/KNOWN_LIMITATIONS.md`](docs/KNOWN_LIMITATIONS.md) for the full threat and trust model.

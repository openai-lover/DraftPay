import { randomUUID } from "node:crypto";

export interface SourceChallenge {
  address: string;
  contest: string;
  transactionHash: string;
  submissionId: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
}

export const SOURCE_CHALLENGE_TTL_MS = 5 * 60_000;

export function formatSourceChallenge(challenge: SourceChallenge): string {
  return [
    "DraftPay source access",
    `Address: ${challenge.address}`,
    `Contest: ${challenge.contest}`,
    `Settlement: ${challenge.transactionHash}`,
    `Winner submission: ${challenge.submissionId}`,
    `Nonce: ${challenge.nonce}`,
    `Issued: ${challenge.issuedAt}`,
    `Expires: ${challenge.expiresAt}`,
  ].join("\n");
}

export function issueSourceChallenge(
  input: Omit<SourceChallenge, "nonce" | "issuedAt" | "expiresAt">,
  now = Date.now(),
) {
  const challenge: SourceChallenge = {
    ...input,
    nonce: randomUUID(),
    issuedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SOURCE_CHALLENGE_TTL_MS).toISOString(),
  };
  return { ...challenge, message: formatSourceChallenge(challenge) };
}

export function isSourceChallengeFresh(challenge: SourceChallenge, now = Date.now()): boolean {
  const issuedAt = Date.parse(challenge.issuedAt);
  const expiresAt = Date.parse(challenge.expiresAt);
  return (
    Number.isFinite(issuedAt) &&
    Number.isFinite(expiresAt) &&
    expiresAt - issuedAt === SOURCE_CHALLENGE_TTL_MS &&
    issuedAt <= now + 30_000 &&
    expiresAt > now
  );
}

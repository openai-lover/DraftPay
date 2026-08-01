import { randomUUID } from "node:crypto";

interface SourceChallenge {
  address: string;
  contest: string;
  transactionHash: string;
  submissionId: string;
  message: string;
  expiresAt: number;
}

const runtime = globalThis as typeof globalThis & {
  __draftPaySourceChallenges?: Map<string, SourceChallenge>;
};
const challenges = runtime.__draftPaySourceChallenges ?? new Map<string, SourceChallenge>();
runtime.__draftPaySourceChallenges = challenges;

export function issueSourceChallenge(input: Omit<SourceChallenge, "message" | "expiresAt">) {
  const now = Date.now();
  for (const [key, challenge] of challenges) {
    if (challenge.expiresAt <= now) challenges.delete(key);
  }
  if (challenges.size >= 1_000) {
    const oldest = challenges.keys().next().value as string | undefined;
    if (oldest) challenges.delete(oldest);
  }
  const nonce = randomUUID();
  const expiresAt = now + 5 * 60_000;
  const message = [
    "DraftPay source access",
    `Address: ${input.address}`,
    `Contest: ${input.contest}`,
    `Settlement: ${input.transactionHash}`,
    `Winner submission: ${input.submissionId}`,
    `Nonce: ${nonce}`,
    `Expires: ${new Date(expiresAt).toISOString()}`,
  ].join("\n");
  challenges.set(nonce, { ...input, message, expiresAt });
  return { nonce, message, expiresAt: new Date(expiresAt).toISOString() };
}

export function consumeSourceChallenge(nonce: string): SourceChallenge | null {
  const challenge = challenges.get(nonce) ?? null;
  challenges.delete(nonce);
  if (!challenge || challenge.expiresAt <= Date.now()) return null;
  return challenge;
}

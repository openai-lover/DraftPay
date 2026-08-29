import {
  ARC_TESTNET,
  ARC_TESTNET_RPC_URL,
  assertArcTestnet,
  draftPayContestAbi,
} from "@draftpay/chain";
import { readStoredArtifact } from "@draftpay/agent";
import {
  formatSourceChallenge,
  isSourceChallengeFresh,
  type SourceChallenge,
} from "@/lib/source-access";
import {
  createPublicClient,
  getAddress,
  http,
  keccak256,
  parseEventLogs,
  toBytes,
  verifyMessage,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  challenge: z.object({
    address: z.string().regex(/^0x[\da-fA-F]{40}$/),
    contest: z.string().regex(/^0x[\da-fA-F]{40}$/),
    transactionHash: z.string().regex(/^0x[\da-fA-F]{64}$/),
    submissionId: z.string().regex(/^[1-9]\d*$/),
    nonce: z.string().uuid(),
    issuedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
  signature: z.string().regex(/^0x[\da-fA-F]+$/),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid source request" }, { status: 400 });
  const challenge = parsed.data.challenge as SourceChallenge;
  if (!isSourceChallengeFresh(challenge)) {
    return Response.json({ error: "Challenge expired or invalid" }, { status: 401 });
  }

  const signatureValid = await verifyMessage({
    address: challenge.address as Address,
    message: formatSourceChallenge(challenge),
    signature: parsed.data.signature as Hex,
  });
  if (!signatureValid) return Response.json({ error: "Invalid wallet signature" }, { status: 401 });

  const client = createPublicClient({
    chain: ARC_TESTNET,
    transport: http(process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL),
  });
  assertArcTestnet(await client.getChainId());
  const contest = challenge.contest as Address;
  const transactionHash = challenge.transactionHash as Hash;
  const submissionId = BigInt(challenge.submissionId);
  const [receipt, contestClient, submission] = await Promise.all([
    client.getTransactionReceipt({ hash: transactionHash }),
    client.readContract({ address: contest, abi: draftPayContestAbi, functionName: "client" }),
    client.readContract({
      address: contest,
      abi: draftPayContestAbi,
      functionName: "getSubmission",
      args: [submissionId],
    }),
  ]);
  if (
    receipt.status !== "success" ||
    !receipt.to ||
    getAddress(receipt.to) !== getAddress(contest)
  ) {
    return Response.json(
      { error: "Settlement receipt is not valid for this contest" },
      { status: 403 },
    );
  }
  if (getAddress(contestClient) !== getAddress(challenge.address)) {
    return Response.json({ error: "Signer is not the contest client" }, { status: 403 });
  }

  const events = parseEventLogs({ abi: draftPayContestAbi, logs: receipt.logs, strict: false });
  const winnerEvent = events.find((event) => event.eventName === "WinnerSettled");
  if (!winnerEvent || winnerEvent.args.winnerSubmissionId !== submissionId) {
    return Response.json(
      { error: "Requested artifact is not the settled winner" },
      { status: 403 },
    );
  }

  let source: string;
  try {
    source = await readStoredArtifact(submission.deliverableHash);
  } catch {
    return Response.json(
      { error: "Winner source is not available in artifact storage" },
      { status: 404 },
    );
  }
  if (keccak256(toBytes(source)) !== submission.deliverableHash) {
    return Response.json(
      { error: "Stored source does not match the onchain winner hash" },
      { status: 409 },
    );
  }
  return new Response(source, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="draftpay-submission-${submissionId}-source.html"`,
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

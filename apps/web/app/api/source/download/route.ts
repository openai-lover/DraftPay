import {
  ARC_TESTNET,
  ARC_TESTNET_RPC_URL,
  assertArcTestnet,
  draftPayContestAbi,
} from "@draftpay/chain";
import { preparedArtifacts } from "@draftpay/shared";
import { consumeSourceChallenge } from "@/lib/source-access";
import {
  createPublicClient,
  getAddress,
  http,
  parseEventLogs,
  verifyMessage,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { z } from "zod";

export const runtime = "nodejs";

const submissionBySlug = { northstar: 1n, mina: 2n, kite: 3n } as const;
const requestSchema = z.object({
  nonce: z.string().uuid(),
  signature: z.string().regex(/^0x[\da-fA-F]+$/),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid source request" }, { status: 400 });
  const challenge = consumeSourceChallenge(parsed.data.nonce);
  if (!challenge) {
    return Response.json({ error: "Challenge expired or already used" }, { status: 401 });
  }

  const signatureValid = await verifyMessage({
    address: challenge.address as Address,
    message: challenge.message,
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
  const [receipt, contestClient] = await Promise.all([
    client.getTransactionReceipt({ hash: transactionHash }),
    client.readContract({ address: contest, abi: draftPayContestAbi, functionName: "client" }),
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
  if (!winnerEvent || winnerEvent.args.winnerSubmissionId !== submissionBySlug[challenge.slug]) {
    return Response.json(
      { error: "Requested artifact is not the settled winner" },
      { status: 403 },
    );
  }

  const source = preparedArtifacts[challenge.slug];
  return new Response(source, {
    headers: {
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="draftpay-${challenge.slug}-source.html"`,
      "content-type": "text/html; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

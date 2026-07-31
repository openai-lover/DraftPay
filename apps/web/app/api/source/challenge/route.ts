import { issueSourceChallenge } from "@/lib/source-access";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  address: z.string().regex(/^0x[\da-fA-F]{40}$/),
  contest: z.string().regex(/^0x[\da-fA-F]{40}$/),
  transactionHash: z.string().regex(/^0x[\da-fA-F]{64}$/),
  slug: z.enum(["northstar", "mina", "kite"]),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid source challenge" }, { status: 400 });
  return Response.json(issueSourceChallenge(parsed.data), {
    headers: { "cache-control": "no-store" },
  });
}

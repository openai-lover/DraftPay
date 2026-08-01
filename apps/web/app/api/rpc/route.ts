import { ARC_TESTNET_RPC_URL } from "@draftpay/chain";
import { parseReadOnlyRpcPayload } from "@/lib/rpc-proxy";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 64 * 1024;

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "RPC request is too large" }, { status: 413 });
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return Response.json({ error: "Cross-origin RPC access is not allowed" }, { status: 403 });
      }
    } catch {
      return Response.json({ error: "Invalid request origin" }, { status: 400 });
    }
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "RPC request is too large" }, { status: 413 });
  }

  let value: unknown;
  try {
    value = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON-RPC request" }, { status: 400 });
  }
  const payload = parseReadOnlyRpcPayload(value);
  if (!payload) {
    return Response.json({ error: "Only bounded Arc read methods are allowed" }, { status: 403 });
  }

  try {
    const upstream = await fetch(process.env.ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!upstream.ok) throw new Error(`Arc RPC returned ${upstream.status}`);
    return new Response(await upstream.text(), {
      status: 200,
      headers: {
        "cache-control": "no-store",
        "content-type": "application/json",
        "x-content-type-options": "nosniff",
      },
    });
  } catch (cause) {
    console.error("Arc read proxy failed", cause);
    return Response.json({ error: "Arc RPC is temporarily unavailable" }, { status: 502 });
  }
}

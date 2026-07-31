import { readStoredArtifact } from "@draftpay/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ hash: string }> }) {
  try {
    const { hash } = await context.params;
    const html = await readStoredArtifact(hash);
    return new Response(html, {
      headers: {
        "cache-control": "public, immutable, max-age=31536000",
        "content-security-policy":
          "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'none'; base-uri 'none'; sandbox",
        "content-type": "text/html; charset=utf-8",
        "x-content-type-options": "nosniff",
        "x-draftpay-artifact-mode": "stored-evidence",
      },
    });
  } catch {
    return Response.json({ error: "Artifact not found" }, { status: 404 });
  }
}

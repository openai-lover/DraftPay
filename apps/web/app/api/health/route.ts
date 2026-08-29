import { NextResponse } from "next/server";
import { fetchArcNetworkProof } from "@/lib/network-proof";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const network = await fetchArcNetworkProof();
    return NextResponse.json(
      {
        status: "ok",
        service: "draftpay-web",
        environment: "arc-testnet",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
        network,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: "ok",
        service: "draftpay-web",
        environment: "arc-testnet",
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? null,
        network: {
          status: "degraded",
          message: "The app is healthy, but the live Arc RPC proof is temporarily unavailable.",
          checkedAt: new Date().toISOString(),
          reason: error instanceof Error ? error.message : "Unknown RPC error",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}

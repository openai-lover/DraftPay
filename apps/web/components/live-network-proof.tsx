"use client";

import { CheckCircle2, ExternalLink, RefreshCw, Radio } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ARC_TESTNET_EXPLORER_URL, CIRCLE_GATEWAY_DOCS_URL } from "@/lib/external-links";

type HealthPayload = {
  network:
    | {
        status: "verified";
        checkedAt: string;
        latencyMs: number;
        chainId: number;
        blockNumber: string;
        usdc: { address: string; decimals: number; contractCodePresent: boolean };
        gatewayWallet: { address: string; contractCodePresent: boolean };
      }
    | {
        status: "degraded";
        checkedAt: string;
        message: string;
      };
};

function compactAddress(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

export function LiveNetworkProof() {
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error(`Health endpoint returned ${response.status}`);
      setPayload((await response.json()) as HealthPayload);
    } catch {
      setError("Live verification is temporarily unavailable. The product remains usable.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const network = payload?.network;
  const verified = network?.status === "verified";

  return (
    <section className="network-proof" aria-labelledby="network-proof-title">
      <div className="network-proof__head">
        <div>
          <span className={`live-signal${verified ? " live-signal--verified" : ""}`}>
            <Radio size={13} /> Live network check
          </span>
          <h2 id="network-proof-title">Arc and Circle targets, verified at request time.</h2>
          <p>
            This panel calls Arc Testnet directly. It does not use the seeded marketplace data or a
            cached screenshot.
          </p>
        </div>
        <button
          className="proof-refresh"
          type="button"
          onClick={() => void load()}
          disabled={isLoading}
        >
          <RefreshCw size={15} className={isLoading ? "spin" : undefined} />
          {isLoading ? "Checking" : "Check again"}
        </button>
      </div>

      {verified ? (
        <div className="network-proof__grid" aria-live="polite">
          <div className="network-proof__metric">
            <span>Arc Testnet</span>
            <strong>Chain {network.chainId.toLocaleString("en-US")}</strong>
            <small>Latest block {Number(network.blockNumber).toLocaleString("en-US")}</small>
          </div>
          <a
            className="network-proof__metric"
            href={`${ARC_TESTNET_EXPLORER_URL}/address/${network.usdc.address}`}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              USDC contract <ExternalLink size={11} />
            </span>
            <strong>{compactAddress(network.usdc.address)}</strong>
            <small>{network.usdc.decimals} decimals · bytecode present</small>
          </a>
          <a
            className="network-proof__metric"
            href={CIRCLE_GATEWAY_DOCS_URL}
            target="_blank"
            rel="noreferrer"
          >
            <span>
              Circle Gateway <ExternalLink size={11} />
            </span>
            <strong>{compactAddress(network.gatewayWallet.address)}</strong>
            <small>Domain 26 · bytecode present</small>
          </a>
          <div className="network-proof__metric">
            <span>Proof response</span>
            <strong className="network-proof__success">
              <CheckCircle2 size={17} /> Verified
            </strong>
            <small>
              {network.latencyMs} ms · {new Date(network.checkedAt).toLocaleTimeString()}
            </small>
          </div>
        </div>
      ) : (
        <div className="network-proof__degraded" aria-live="polite">
          {error ??
            (network?.status === "degraded"
              ? network.message
              : "Contacting Arc Testnet and checking contract bytecode…")}
        </div>
      )}
    </section>
  );
}

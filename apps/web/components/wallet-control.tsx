"use client";

import { ARC_TESTNET_CHAIN_ID } from "@draftpay/chain";
import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/format";

export function WalletControl() {
  const account = useAccount();
  const chainId = useChainId();
  const [injectedAvailable, setInjectedAvailable] = useState<boolean | null>(null);
  const { connectors, connect, error: connectError, isPending: isConnecting, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  useEffect(() => setInjectedAvailable("ethereum" in window), []);

  if (!account.isConnected) {
    return (
      <div className="wallet-connect-state">
        <button
          className="button button--secondary"
          type="button"
          disabled={isConnecting || connectors.length === 0 || injectedAvailable !== true}
          onClick={() => {
            reset();
            if (connectors[0]) connect({ connector: connectors[0] });
          }}
        >
          {isConnecting
            ? "Connecting…"
            : injectedAvailable === false
              ? "Wallet extension required"
              : "Connect wallet"}
        </button>
        {connectError && (
          <span className="wallet-connect-error" role="alert">
            {connectError.message}
          </span>
        )}
      </div>
    );
  }

  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    return (
      <button
        className="button"
        type="button"
        disabled={isSwitching}
        onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
      >
        {isSwitching ? "Switching…" : "Switch to Arc"}
      </button>
    );
  }

  return (
    <div className="wallet-control">
      <span className="network-dot" aria-hidden="true" />
      <span className="sr-only" role="status">
        Connected to Arc Testnet
      </span>
      <button
        className="wallet-address"
        type="button"
        onClick={() => disconnect()}
        aria-label={`Disconnect wallet ${shortAddress(account.address)}`}
        title="Disconnect wallet"
      >
        {shortAddress(account.address)}
      </button>
    </div>
  );
}

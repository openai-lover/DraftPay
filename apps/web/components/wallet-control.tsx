"use client";

import { ARC_TESTNET_CHAIN_ID } from "@draftpay/chain";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { shortAddress } from "@/lib/format";

export function WalletControl() {
  const account = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();

  if (!account.isConnected) {
    return (
      <button
        className="button button--secondary"
        type="button"
        disabled={isConnecting || connectors.length === 0}
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
      >
        {isConnecting ? "Connecting…" : "Connect wallet"}
      </button>
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
      <span className="network-dot" aria-label="Connected to Arc Testnet" />
      <button
        className="wallet-address"
        type="button"
        onClick={() => disconnect()}
        title="Disconnect wallet"
      >
        {shortAddress(account.address)}
      </button>
    </div>
  );
}

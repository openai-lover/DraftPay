"use client";

import { ARC_TESTNET_CHAIN_ID } from "@draftpay/chain";
import { ChevronDown, ExternalLink, Smartphone, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { ARC_TESTNET_FAUCET_URL } from "@/lib/external-links";
import { shortAddress } from "@/lib/format";

function connectionErrorMessage(error: Error | null): string | null {
  if (!error) return null;

  if (/rejected|denied|cancelled|closed modal/i.test(error.message)) {
    return "Connection cancelled in the wallet.";
  }

  if (/provider|not found|unavailable/i.test(error.message)) {
    return "No browser wallet was detected. Use MetaMask mobile or install a wallet extension.";
  }

  if (/timed out|timeout|expired/i.test(error.message)) {
    return "The QR code expired. Select MetaMask mobile again to refresh it.";
  }

  return error.message.split("\n")[0]!.slice(0, 180);
}

export function WalletControl() {
  const [chooserOpen, setChooserOpen] = useState(false);
  const [hasBrowserWallet, setHasBrowserWallet] = useState(false);
  const account = useAccount();
  const chainId = useChainId();
  const {
    connectors,
    connect,
    error: connectError,
    isPending: isConnecting,
    reset: resetConnection,
  } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, error: switchError, isPending: isSwitching } = useSwitchChain();

  const metaMaskConnector = connectors.find((connector) => connector.id === "metaMaskSDK");
  const browserConnector = connectors.find((connector) => connector.id === "injected");

  useEffect(() => {
    setHasBrowserWallet("ethereum" in window);
  }, []);

  useEffect(() => {
    if (account.isConnected) setChooserOpen(false);
  }, [account.isConnected]);

  function openChooser() {
    resetConnection();
    setChooserOpen((open) => !open);
  }

  function requestConnection(connector: (typeof connectors)[number]) {
    resetConnection();
    connect({ connector, chainId: ARC_TESTNET_CHAIN_ID });
  }

  if (!account.isConnected) {
    return (
      <div className="wallet-connect">
        <button
          className="button button--secondary"
          type="button"
          aria-expanded={chooserOpen}
          aria-haspopup="dialog"
          disabled={connectors.length === 0}
          onClick={openChooser}
        >
          {isConnecting ? "Opening wallet…" : "Connect wallet"}
          <ChevronDown size={14} />
        </button>
        {chooserOpen && (
          <div className="wallet-menu" role="dialog" aria-label="Connect an Arc Testnet wallet">
            <div className="wallet-menu__head">
              <div>
                <strong>Connect an Arc Testnet wallet</strong>
                <span>Chain ID {ARC_TESTNET_CHAIN_ID.toLocaleString("en")}</span>
              </div>
              <button
                className="wallet-menu__close"
                type="button"
                aria-label="Close wallet chooser"
                onClick={() => setChooserOpen(false)}
              >
                <X size={15} />
              </button>
            </div>
            <div className="wallet-menu__options">
              {metaMaskConnector && (
                <button
                  className="wallet-option"
                  type="button"
                  disabled={isConnecting}
                  onClick={() => requestConnection(metaMaskConnector)}
                >
                  <span className="wallet-option__icon wallet-option__icon--metamask">
                    <Smartphone size={17} />
                  </span>
                  <span>
                    <strong>MetaMask mobile</strong>
                    <small>Scan a QR code with the MetaMask app</small>
                  </span>
                </button>
              )}
              {browserConnector && (
                <button
                  className="wallet-option"
                  type="button"
                  disabled={isConnecting || !hasBrowserWallet}
                  onClick={() => requestConnection(browserConnector)}
                >
                  <span className="wallet-option__icon">
                    <WalletCards size={17} />
                  </span>
                  <span>
                    <strong>Browser wallet</strong>
                    <small>
                      {hasBrowserWallet ? "Use an installed EVM wallet" : "No extension detected"}
                    </small>
                  </span>
                </button>
              )}
            </div>
            {connectionErrorMessage(connectError) && (
              <p className="wallet-menu__error" role="alert">
                {connectionErrorMessage(connectError)}
              </p>
            )}
            <div className="wallet-menu__foot">
              <a
                className="wallet-menu__faucet"
                href={ARC_TESTNET_FAUCET_URL}
                target="_blank"
                rel="noreferrer"
              >
                Get Arc Testnet USDC
                <ExternalLink size={12} />
              </a>
              <p>Testnet only. DraftPay never asks for a seed phrase or private key.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (chainId !== ARC_TESTNET_CHAIN_ID) {
    return (
      <div className="wallet-network-action">
        <button
          className="button"
          type="button"
          disabled={isSwitching}
          onClick={() => switchChain({ chainId: ARC_TESTNET_CHAIN_ID })}
        >
          {isSwitching ? "Switching…" : "Switch to Arc"}
        </button>
        {switchError && (
          <p className="wallet-menu__error" role="alert">
            {connectionErrorMessage(switchError)}
          </p>
        )}
      </div>
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

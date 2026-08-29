"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { ARC_TESTNET, ARC_TESTNET_RPC_URL } from "@draftpay/chain";

const wagmiConfig = createConfig({
  chains: [ARC_TESTNET],
  connectors: [
    metaMask({
      dapp: { name: "DraftPay" },
      analytics: { enabled: false },
      ui: { preferExtension: false, showInstallModal: true },
    }),
    injected({ shimDisconnect: true }),
  ],
  multiInjectedProviderDiscovery: false,
  transports: {
    [ARC_TESTNET.id]: http(process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL ?? ARC_TESTNET_RPC_URL),
  },
  ssr: true,
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

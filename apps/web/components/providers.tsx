"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { ARC_TESTNET } from "@draftpay/chain";

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
    [ARC_TESTNET.id]: http("/api/rpc"),
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

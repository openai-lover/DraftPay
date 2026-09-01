import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";
import { WalletControl } from "@/components/wallet-control";
import { ARC_TESTNET_FAUCET_URL } from "@/lib/external-links";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: { default: "DraftPay — Programmable build contests", template: "%s · DraftPay" },
  description: "Post a brief. Agents build. Programmable money pays fairly on Arc Testnet.",
  applicationName: "DraftPay",
  keywords: ["Arc", "USDC", "Circle Gateway", "x402", "AI agents", "build contests"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "DraftPay — Programmable build contests",
    description: "Outcome-based agent work, exact USDC escrow, and verified settlement on Arc.",
    siteName: "DraftPay",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DraftPay on Arc" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DraftPay — Programmable build contests",
    description: "Agents build. Arc settles. Every claim stays verifiable.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#090a0c",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Sora:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="testnet-banner">
            <span>Arc Testnet · verified hackathon deployment · never use real funds</span>
            <a
              className="testnet-faucet-link"
              href={ARC_TESTNET_FAUCET_URL}
              target="_blank"
              rel="noreferrer"
            >
              Get testnet USDC ↗
            </a>
          </div>
          <header className="site-header">
            <div className="shell site-header__inner">
              <Link href="/" className="brand" aria-label="DraftPay home">
                <span className="brand-mark">DP</span>
                DraftPay
              </Link>
              <nav className="site-nav" aria-label="Primary navigation">
                <Link href="/contests">Explore</Link>
                <Link href="/activity">Agent activity</Link>
                <Link href="/proof">Proof room</Link>
                <Link href="/agents/northstar">Agent profile</Link>
              </nav>
              <WalletControl />
            </div>
          </header>
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <div className="shell site-footer__inner">
              <span>DraftPay · Programmable agent commerce</span>
              <span>Arc Testnet · Circle Gateway · Unaudited</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

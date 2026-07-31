import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { Providers } from "@/components/providers";
import { WalletControl } from "@/components/wallet-control";

export const metadata: Metadata = {
  title: { default: "DraftPay — Programmable build contests", template: "%s · DraftPay" },
  description: "Post a brief. Agents build. Programmable money pays fairly on Arc Testnet.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="testnet-banner">
            Experimental hackathon MVP running on Arc Testnet. Do not use real funds.
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
                <Link href="/agents/northstar">Agent profile</Link>
              </nav>
              <WalletControl />
            </div>
          </header>
          <main className="site-main">{children}</main>
          <footer className="site-footer">
            <div className="shell site-footer__inner">
              <span>DraftPay · Programmable Money Hackathon</span>
              <span>Arc Testnet · USDC · Unaudited demo</span>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}

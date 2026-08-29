import type { NextConfig } from "next";

const scriptPolicy =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const commonSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

function contentSecurityPolicy(frameAncestors: "'none'" | "'self'") {
  return `default-src 'self'; ${scriptPolicy}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://rpc.testnet.arc.network wss://rpc.testnet.arc.network wss://mm-sdk-relay.api.cx.metamask.io https://mm-sdk-analytics.api.cx.metamask.io https://raw.githubusercontent.com; frame-src 'self' https://fwd.metamask.io; frame-ancestors ${frameAncestors}; base-uri 'self'; form-action 'self'`;
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  transpilePackages: ["@draftpay/agent", "@draftpay/chain", "@draftpay/shared", "@draftpay/ui"],
  async headers() {
    return [
      {
        source: "/evidence/artifacts/:path*",
        headers: [
          ...commonSecurityHeaders,
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy("'self'"),
          },
        ],
      },
      {
        source: "/((?!evidence/artifacts).*)",
        headers: [
          ...commonSecurityHeaders,
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy("'none'"),
          },
        ],
      },
    ];
  },
};

export default nextConfig;

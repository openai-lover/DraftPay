import { ImageResponse } from "next/og";

export const alt = "DraftPay — programmable agent work settled on Arc";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "68px 76px",
        background: "#f7f5ef",
        color: "#0d1b2d",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 30, fontWeight: 700 }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "#0d1b2d",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
            }}
          >
            DP
          </div>
          DraftPay
        </div>
        <div style={{ color: "#155eef", fontSize: 22, fontWeight: 700 }}>ARC + CIRCLE x402</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            maxWidth: 980,
            fontSize: 76,
            lineHeight: 0.98,
            letterSpacing: "-4px",
            fontWeight: 700,
          }}
        >
          Agents build. Programmable money pays fairly.
        </div>
        <div style={{ color: "#4c596a", fontSize: 27 }}>
          Exact USDC escrow · bounded autonomous decisions · independently verifiable evidence
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, fontSize: 20 }}>
        {[
          "Arc Testnet settlement",
          "Circle Gateway nanopayments",
          "Reproducible quality gates",
        ].map((label) => (
          <div
            key={label}
            style={{
              padding: "12px 18px",
              border: "1px solid #bcc4cf",
              borderRadius: 999,
              background: "#fffefb",
            }}
          >
            {label}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}

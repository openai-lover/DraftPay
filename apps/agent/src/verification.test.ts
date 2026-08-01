import { describe, expect, it } from "vitest";
import { verifyLandingPage } from "./verification";

const safeHtml = `<!doctype html><html lang="en"><head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>@media (max-width: 680px) { main { width: 100%; } }</style>
</head><body>
  <section data-section="hero"><h1>Required line</h1><a data-cta href="#contact">Go</a></section>
  <section data-section="pricing">Pricing</section>
  <section data-section="contact"><form><input type="email" aria-label="Email" /></form></section>
  ${"content ".repeat(40)}
</body></html>`;

const browser = {
  previewLoaded: true,
  mobileNoOverflow: true,
  ctaVisible: true,
  formUsable: true,
  detail: "Test browser verification",
};

describe("Verification Agent", () => {
  it("qualifies a safe complete artifact", () => {
    const result = verifyLandingPage({
      html: safeHtml,
      requiredHeadline: "Required line",
      contentHash: "0x01",
      knownContentHashes: [],
      browser,
    });
    expect(result.qualified).toBe(true);
    expect(result.score).toBe(100);
  });

  it("never lets score override a malicious hard failure", () => {
    const result = verifyLandingPage({
      html: `${safeHtml}<script src="https://bad.example/payload.js"></script>`,
      requiredHeadline: "Required line",
      contentHash: "0x01",
      knownContentHashes: [],
      browser,
    });
    expect(result.qualified).toBe(false);
    expect(result.checks.find((check) => check.id === "scripts")?.passed).toBe(false);
  });

  it("rejects duplicate content hashes", () => {
    const result = verifyLandingPage({
      html: safeHtml,
      requiredHeadline: "Required line",
      contentHash: "0x01",
      knownContentHashes: ["0x01"],
      browser,
    });
    expect(result.qualified).toBe(false);
  });

  it("rejects a statically unsafe mobile minimum width", () => {
    const result = verifyLandingPage({
      html: safeHtml.replace("main { width: 100%; }", "main { min-width: 900px; }"),
      requiredHeadline: "Required line",
      contentHash: "0x01",
      knownContentHashes: [],
      browser,
    });
    expect(result.qualified).toBe(false);
    expect(result.checks.find((check) => check.id === "mobile")?.detail).toContain("900px");
  });

  it("rejects browser-rendered mobile overflow", () => {
    const result = verifyLandingPage({
      html: safeHtml,
      requiredHeadline: "Required line",
      contentHash: "0x02",
      knownContentHashes: [],
      browser: { ...browser, mobileNoOverflow: false },
    });
    expect(result.qualified).toBe(false);
    expect(result.checks.find((check) => check.id === "runtime-mobile")?.passed).toBe(false);
  });
});

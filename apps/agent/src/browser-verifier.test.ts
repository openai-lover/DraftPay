import { describe, expect, it } from "vitest";
import { verifyLandingPageInBrowser } from "./browser-verifier";

describe("browser verifier", () => {
  it("renders the production-safe artifact in Chromium without build-runtime helpers", async () => {
    const result = await verifyLandingPageInBrowser(`<!doctype html>
      <html lang="en"><head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>body { margin: 0 } @media (max-width: 680px) { main { width: 100%; } }</style>
      </head><body><main>
        <a href="#contact" data-cta>Start</a>
        <form id="contact"><input type="email" aria-label="Email" /></form>
      </main></body></html>`);

    expect(result).toMatchObject({
      previewLoaded: true,
      mobileNoOverflow: true,
      ctaVisible: true,
      formUsable: true,
    });
    expect(result.detail).toContain("390");
  });
});

import { chromium } from "@playwright/test";
import type { BrowserVerification } from "./verification";

function failureDetail(cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "Unknown browser verification error";
  return message.replace(/\s+/g, " ").slice(0, 240);
}

export async function verifyLandingPageInBrowser(html: string): Promise<BrowserVerification> {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: 390, height: 844 },
    });
    await context.route("**/*", (route) => route.abort());
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 15_000 });
    // Keep this browser-side expression independent from the tsx/esbuild runtime. Passing a
    // transpiled function can inject helpers such as `__name` that do not exist in the page.
    const result = (await page.evaluate(`(() => {
      const visible = (element) => {
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" &&
          style.visibility !== "hidden" &&
          Number(style.opacity) > 0 &&
          rect.width > 0 &&
          rect.height > 0;
      };
      const cta = document.querySelector("[data-cta]");
      const email = document.querySelector('input[type="email"]');
      const form = email ? email.closest("form") : null;
      return {
        mobileNoOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
        ctaVisible: visible(cta),
        formUsable: visible(form) && visible(email) && !email.hasAttribute("disabled"),
      };
    })()`)) as {
      mobileNoOverflow: boolean;
      ctaVisible: boolean;
      formUsable: boolean;
    };
    return {
      previewLoaded: true,
      ...result,
      detail: "Rendered in headless Chromium at 390×844",
    };
  } catch (cause) {
    return {
      previewLoaded: false,
      mobileNoOverflow: false,
      ctaVisible: false,
      formUsable: false,
      detail: `Chromium verification failed: ${failureDetail(cause)}`,
    };
  } finally {
    await browser?.close();
  }
}

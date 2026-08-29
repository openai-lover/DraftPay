import { mkdir, readFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium, type Page } from "../apps/web/node_modules/@playwright/test/index.mjs";

interface Evidence {
  artifacts: Array<{ publicUrl: string }>;
  submissions: { winner: Array<{ explorerUrl: string }> };
  evaluations: { winner: Array<{ explorerUrl: string }> };
  settlements: {
    winner: { explorerUrl: string };
    noWinner: { explorerUrl: string };
  };
}

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "outputs");
const evidence = JSON.parse(
  await readFile(resolve(root, "apps", "web", "data", "final-run.json"), "utf8"),
) as Evidence;

async function caption(page: Page, eyebrow: string, headline: string, detail: string) {
  await page.evaluate(
    ({ eyebrow, headline, detail }) => {
      document.querySelector("[data-draftpay-video-caption]")?.remove();
      const overlay = document.createElement("aside");
      overlay.dataset.draftpayVideoCaption = "true";
      overlay.innerHTML = `<span>${eyebrow}</span><strong>${headline}</strong><p>${detail}</p>`;
      overlay.style.cssText =
        "position:fixed;z-index:2147483647;left:34px;right:34px;bottom:28px;padding:18px 22px;border:1px solid rgba(255,255,255,.2);border-radius:18px;background:rgba(5,17,34,.9);box-shadow:0 18px 60px rgba(0,0,0,.35);backdrop-filter:blur(18px);color:white;font-family:Inter,Arial,sans-serif;pointer-events:none";
      const label = overlay.querySelector("span") as HTMLElement;
      label.style.cssText =
        "display:block;margin-bottom:5px;color:#78efc5;font:700 11px monospace;letter-spacing:.12em;text-transform:uppercase";
      const title = overlay.querySelector("strong") as HTMLElement;
      title.style.cssText = "display:block;font-size:25px;letter-spacing:-.025em";
      const copy = overlay.querySelector("p") as HTMLElement;
      copy.style.cssText = "margin:5px 0 0;color:#bfd0df;font-size:15px";
      document.body.appendChild(overlay);
    },
    { eyebrow, headline, detail },
  );
}

async function shot(
  page: Page,
  input: {
    url: string;
    eyebrow: string;
    headline: string;
    detail: string;
    holdMs: number;
    scrollY?: number;
  },
) {
  await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  if (input.scrollY) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), input.scrollY);
    await page.waitForTimeout(1_500);
  }
  await caption(page, input.eyebrow, input.headline, input.detail);
  await page.waitForTimeout(input.holdMs);
}

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 810 },
  recordVideo: { dir: outputDirectory, size: { width: 1440, height: 810 } },
});
const page = await context.newPage();
const video = page.video();

await shot(page, {
  url: "https://draft-pay-web.vercel.app/",
  eyebrow: "DraftPay on Arc",
  headline: "Post a brief. Agents build. The contract pays.",
  detail: "Outcome-based build contests for humans and autonomous agents, settled in USDC.",
  holdMs: 16_000,
});
await shot(page, {
  url: "https://draft-pay-web.vercel.app/#live-proof",
  eyebrow: "The complete proof chain",
  headline: "One agent decision. One paid tool. One immutable payout.",
  detail: "Every handoff links to public artifact or ArcScan evidence.",
  holdMs: 18_000,
  scrollY: 4_500,
});
await shot(page, {
  url: evidence.artifacts[0]!.publicUrl,
  eyebrow: "Real generated artifact",
  headline: "Built after a settled x402 analysis purchase.",
  detail: "Rendered at 390px, verified 12/12, content-hashed, and stored publicly.",
  holdMs: 22_000,
});
await shot(page, {
  url: evidence.submissions.winner[0]!.explorerUrl,
  eyebrow: "Arc submission",
  headline: "The artifact hash and retrievable URI are bound onchain.",
  detail: "The builder wallet—not the web server—submitted this proof.",
  holdMs: 20_000,
});
await shot(page, {
  url: evidence.evaluations.winner.at(-1)!.explorerUrl,
  eyebrow: "Deterministic evaluation",
  headline: "Three qualified finalists are ranked on Arc.",
  detail: "The evaluator can qualify and rank; it cannot redirect escrow or choose the winner.",
  holdMs: 19_000,
});
await shot(page, {
  url: evidence.settlements.winner.explorerUrl,
  eyebrow: "Terminal outcome A",
  headline: "Winner selected: 95% plus a 5% finalist pool.",
  detail: "The contract conserves the complete 5.00 USDC prize down to atomic units.",
  holdMs: 25_000,
});
await shot(page, {
  url: evidence.settlements.noWinner.explorerUrl,
  eyebrow: "Terminal outcome B",
  headline: "No winner: verified effort still receives 15 / 10 / 5.",
  detail: "3.50 USDC returns to the client; 1.50 USDC rewards the three ranked finalists.",
  holdMs: 25_000,
});
await shot(page, {
  url: "https://draft-pay-web.vercel.app/evidence/final-run.json",
  eyebrow: "Public judge packet",
  headline: "App, code, artifact, payment, and Arc receipts stay inspectable.",
  detail: "DraftPay makes agent decisions legible and programmable-money outcomes enforceable.",
  holdMs: 15_000,
});

await context.close();
await browser.close();
if (!video) throw new Error("Playwright video recording did not start");
const recordedPath = await video.path();
const finalPath = resolve(outputDirectory, "DraftPay-3min-demo.webm");
await rename(recordedPath, finalPath);
console.log(JSON.stringify({ video: finalPath, targetDurationSeconds: 160 }, null, 2));

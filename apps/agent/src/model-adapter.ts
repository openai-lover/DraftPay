import { preparedArtifacts, type BriefAnalysisResponse } from "@draftpay/shared";
import { z } from "zod";

/**
 * Everything the generator is allowed to see. `focusRequirements` and `complexity` come from
 * the x402-purchased brief analysis, so the paid call changes what gets built rather than
 * being recorded as inert evidence.
 */
export interface GenerationBrief {
  specification: string;
  requiredHeadline: string;
  requiredSections: string[];
  focusRequirements: string[];
  complexity: BriefAnalysisResponse["complexity"];
  estimatedBuildMinutes: number;
}

export interface GeneratedArtifact {
  mode: "fixture" | "real";
  html: string;
  providerLabel: string;
  focusApplied: string[];
}

export interface ModelAdapter {
  generateLandingPage(brief: GenerationBrief): Promise<GeneratedArtifact>;
}

/**
 * The deterministic verifier every submission is graded against. The prompt states these
 * rules explicitly so a real model is asked to satisfy the same contract the evaluator
 * enforces, instead of being asked for "a nice landing page" and hoping.
 */
export const HARD_CHECK_CONTRACT = [
  "Return one complete HTML document and nothing else. No commentary, no markdown fences.",
  "The document must start with <!doctype html> and set a lang attribute on <html>.",
  'Include <meta name="viewport" content="width=device-width, initial-scale=1">.',
  "Include at least one @media (max-width: ...) breakpoint and never set a min-width above 390px.",
  'Mark the three required regions with data-section="hero", data-section="pricing" and data-section="contact".',
  "Include exactly one primary action carrying a data-cta attribute on an <a> or <button>.",
  'Include a <form> containing an <input type="email"> that has an id or aria-label.',
  "Never emit <script>, javascript: URLs, or inline on* event handlers. Style with <style> only.",
  "Reproduce the required headline verbatim inside the hero region.",
] as const;

export function buildSystemPrompt(): string {
  return [
    "You are a build agent competing in an outcome contest. Your output is graded by a",
    "deterministic verifier before any human sees it. Failing any single rule below means the",
    "submission earns nothing, so correctness outranks creativity.",
    "",
    ...HARD_CHECK_CONTRACT.map((rule, index) => `${index + 1}. ${rule}`),
  ].join("\n");
}

export function buildUserPrompt(brief: GenerationBrief): string {
  const lines = [
    `Required headline (verbatim): ${brief.requiredHeadline}`,
    `Required sections: ${brief.requiredSections.join(", ")}`,
    `Assessed complexity: ${brief.complexity} (about ${brief.estimatedBuildMinutes} minutes of work)`,
  ];
  if (brief.focusRequirements.length > 0) {
    lines.push(
      `The paid brief analysis flagged these as under-specified. Resolve them explicitly: ${brief.focusRequirements.join(", ")}.`,
    );
  } else {
    lines.push("The paid brief analysis found no under-specified requirements.");
  }
  lines.push("", "Contest requirements as JSON:", brief.specification);
  return lines.join("\n");
}

const MIN_HTML_BYTES = 200;
const MAX_HTML_BYTES = 500_000;

export function extractHtmlDocument(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.search(/<!doctype html|<html\b/i);
  if (start === -1) throw new Error("Model response did not contain an HTML document");
  const html = candidate.slice(start).trim();
  if (html.length < MIN_HTML_BYTES || html.length > MAX_HTML_BYTES) {
    throw new Error(`Model returned ${html.length} bytes, outside the accepted artifact range`);
  }
  return html;
}

export class FixtureModelAdapter implements ModelAdapter {
  async generateLandingPage(brief: GenerationBrief): Promise<GeneratedArtifact> {
    return {
      mode: "fixture",
      html: preparedArtifacts.northstar,
      providerLabel: "Prepared deterministic fixture",
      focusApplied: brief.focusRequirements,
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * A credential-free, real build adapter for the live Arc demo. It generates a fresh artifact
 * from the approved brief and the paid x402 analysis rather than replaying a prepared fixture.
 * It is intentionally described as deterministic—not as an LLM.
 */
export class DeterministicBuildAdapter implements ModelAdapter {
  async generateLandingPage(brief: GenerationBrief): Promise<GeneratedArtifact> {
    const headline = escapeHtml(brief.requiredHeadline);
    const focus = brief.focusRequirements.length
      ? brief.focusRequirements.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
      : "<li>Clear pricing, proof, and conversion path</li>";
    const complexity = escapeHtml(brief.complexity);
    const buildMinutes = Number.isFinite(brief.estimatedBuildMinutes)
      ? Math.max(1, Math.round(brief.estimatedBuildMinutes))
      : 15;

    return {
      mode: "real",
      providerLabel: "DraftPay deterministic builder v1",
      focusApplied: brief.focusRequirements,
      html: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ledgerly — close faster</title>
  <style>
    :root{font-family:Inter,system-ui,sans-serif;color:#12312b;background:#f7fff4}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#d8ff69 0,transparent 35%),#f7fff4;color:#12312b}a{color:inherit}.wrap{width:min(1120px,calc(100% - 40px));margin:auto}.nav{display:flex;align-items:center;justify-content:space-between;padding:24px 0;font-weight:800}.brand{display:flex;gap:10px;align-items:center}.mark{width:34px;height:34px;border-radius:11px;background:#12312b;color:#d8ff69;display:grid;place-items:center}.hero{min-height:660px;display:grid;grid-template-columns:1.15fr .85fr;gap:56px;align-items:center;padding:70px 0 100px}.eyebrow{font:700 12px ui-monospace,monospace;text-transform:uppercase;letter-spacing:.16em;color:#227a63}.hero h1{font-size:clamp(50px,7vw,92px);line-height:.92;letter-spacing:-.065em;margin:18px 0 28px;max-width:850px}.hero p{font-size:20px;line-height:1.6;max-width:650px;color:#49655e}.actions{display:flex;gap:12px;margin-top:34px}.primary,.secondary{display:inline-flex;padding:15px 20px;border-radius:14px;text-decoration:none;font-weight:800}.primary{background:#12312b;color:white}.secondary{border:1px solid #9bb7ae;background:#fff}.proof{background:#12312b;color:white;border-radius:30px;padding:28px;box-shadow:0 28px 70px #12312b2e;transform:rotate(2deg)}.proof strong{font-size:50px;letter-spacing:-.05em}.proof small{display:block;color:#b6d2ca;margin-top:8px}.proof ul{padding-left:20px;line-height:1.8;color:#d8ff69}.section{padding:110px 0}.section h2{font-size:clamp(36px,5vw,62px);letter-spacing:-.045em;margin:0 0 40px}.pricing{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{background:white;border:1px solid #cfe0da;border-radius:24px;padding:28px}.card.featured{background:#d8ff69;border-color:#12312b;transform:translateY(-12px)}.price{font-size:44px;font-weight:900;letter-spacing:-.04em}.contact{background:#d8ff69;border-radius:32px;padding:44px;display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:center}.contact h2{margin:0;font-size:clamp(34px,5vw,60px)}form{display:flex;gap:10px;background:white;padding:8px;border-radius:16px}input{min-width:0;flex:1;border:0;padding:14px;font:inherit}button{border:0;border-radius:11px;padding:14px 18px;background:#12312b;color:white;font-weight:800}@media(max-width:760px){.hero{grid-template-columns:1fr;padding-top:40px}.proof{transform:none}.pricing{grid-template-columns:1fr}.card.featured{transform:none}.contact{grid-template-columns:1fr;padding:24px}.contact form{flex-direction:column}.contact button{width:100%}.actions{flex-direction:column}.primary,.secondary{justify-content:center}.hero h1{font-size:50px;overflow-wrap:anywhere}}
  </style>
</head>
<body>
  <nav class="nav wrap"><span class="brand"><span class="mark">L</span>Ledgerly</span><span>Built in ${buildMinutes} min</span></nav>
  <main>
    <section class="hero wrap" data-section="hero">
      <div><span class="eyebrow">Accounting without the after-hours</span><h1>${headline}</h1><p>Ledgerly turns scattered transactions into clean, review-ready books—so your team sees the close, the exceptions, and the next move in one calm workspace.</p><div class="actions"><a class="primary" data-cta href="#contact">Start a clean close</a><a class="secondary" href="#pricing">See pricing</a></div></div>
      <aside class="proof"><span class="eyebrow">Paid brief analysis applied</span><strong>${complexity}</strong><small>assessed complexity</small><ul>${focus}</ul></aside>
    </section>
    <section class="section wrap" id="pricing" data-section="pricing"><span class="eyebrow">Predictable from day one</span><h2>Pricing that scales with the books.</h2><div class="pricing"><article class="card"><h3>Starter</h3><p class="price">$49</p><p>For focused teams closing one entity.</p></article><article class="card featured"><h3>Growth</h3><p class="price">$149</p><p>Multi-entity close, approvals, and reporting.</p></article><article class="card"><h3>Scale</h3><p class="price">Let’s talk</p><p>Controls and support for complex operations.</p></article></div></section>
    <section class="section wrap" id="contact" data-section="contact"><div class="contact"><h2>Make this your last late close.</h2><form><input id="work-email" type="email" aria-label="Work email" placeholder="you@company.com" required><button type="submit">Book a walkthrough</button></form></div></section>
  </main>
</body>
</html>`,
    };
  }
}

const chatCompletionSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().min(1) }) })).min(1),
});

/** OpenAI-compatible /chat/completions client. Works against any provider exposing that shape. */
export class ChatCompletionsModelAdapter implements ModelAdapter {
  constructor(
    private readonly url: string,
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async generateLandingPage(brief: GenerationBrief): Promise<GeneratedArtifact> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        temperature: 0,
        max_tokens: 8_000,
        messages: [
          { role: "system", content: buildSystemPrompt() },
          { role: "user", content: buildUserPrompt(brief) },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) {
      throw new Error(`Model provider failed with ${response.status}`);
    }
    const parsed = chatCompletionSchema.parse(await response.json());
    const content = parsed.choices[0]?.message.content ?? "";
    return {
      mode: "real",
      html: extractHtmlDocument(content),
      providerLabel: `${new URL(this.url).host} · ${this.model}`,
      focusApplied: brief.focusRequirements,
    };
  }
}

const rawResponseSchema = z.object({ html: z.string().min(MIN_HTML_BYTES).max(MAX_HTML_BYTES) });

/** Adapter for a self-hosted endpoint that already returns `{ html }`. */
export class HttpModelAdapter implements ModelAdapter {
  constructor(
    private readonly url: string,
    private readonly apiKey: string,
  ) {}

  async generateLandingPage(brief: GenerationBrief): Promise<GeneratedArtifact> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({
        task: "responsive-landing-page",
        systemPrompt: buildSystemPrompt(),
        requiredHeadline: brief.requiredHeadline,
        requiredSections: brief.requiredSections,
        focusRequirements: brief.focusRequirements,
        complexity: brief.complexity,
        specification: brief.specification,
      }),
      signal: AbortSignal.timeout(120_000),
    });
    if (!response.ok) throw new Error(`Model provider failed with ${response.status}`);
    const parsed = rawResponseSchema.parse(await response.json());
    return {
      mode: "real",
      html: parsed.html,
      providerLabel: new URL(this.url).host,
      focusApplied: brief.focusRequirements,
    };
  }
}

/**
 * Chooses the generator from the environment. Without a configured provider the agent falls
 * back to the labeled fixture rather than pretending a model ran.
 */
export function createModelAdapter(environment = process.env): ModelAdapter {
  if (environment.MODEL_PROVIDER_KIND === "deterministic") {
    return new DeterministicBuildAdapter();
  }
  const url = environment.MODEL_PROVIDER_URL;
  const apiKey = environment.MODEL_PROVIDER_API_KEY;
  if (!url || !apiKey) return new FixtureModelAdapter();

  const kind =
    environment.MODEL_PROVIDER_KIND ?? (url.includes("chat/completions") ? "chat" : "raw");
  if (kind === "raw") return new HttpModelAdapter(url, apiKey);
  return new ChatCompletionsModelAdapter(
    url,
    apiKey,
    environment.MODEL_PROVIDER_MODEL ?? "gpt-4o-mini",
  );
}

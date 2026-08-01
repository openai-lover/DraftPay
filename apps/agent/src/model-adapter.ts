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

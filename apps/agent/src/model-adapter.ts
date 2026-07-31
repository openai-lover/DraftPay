import { preparedArtifacts } from "@draftpay/shared";
import { z } from "zod";

export interface GeneratedArtifact {
  mode: "fixture" | "real";
  html: string;
  providerLabel: string;
}

export interface ModelAdapter {
  generateLandingPage(specification: string): Promise<GeneratedArtifact>;
}

export class FixtureModelAdapter implements ModelAdapter {
  async generateLandingPage(_specification: string): Promise<GeneratedArtifact> {
    return {
      mode: "fixture",
      html: preparedArtifacts.northstar,
      providerLabel: "Prepared deterministic fixture",
    };
  }
}

const providerResponseSchema = z.object({ html: z.string().min(200).max(500_000) });

export class HttpModelAdapter implements ModelAdapter {
  constructor(
    private readonly url: string,
    private readonly apiKey: string,
  ) {}

  async generateLandingPage(specification: string): Promise<GeneratedArtifact> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ task: "responsive-landing-page", specification }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`Model provider failed with ${response.status}`);
    const parsed = providerResponseSchema.parse(await response.json());
    return { mode: "real", html: parsed.html, providerLabel: new URL(this.url).host };
  }
}

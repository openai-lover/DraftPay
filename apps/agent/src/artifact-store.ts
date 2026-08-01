import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hashSchema, type VerificationCheck } from "@draftpay/shared";

export interface ArtifactEvidence {
  contentHash: string;
  html: string;
  mode: "fixture" | "real";
  providerLabel: string;
  checks: VerificationCheck[];
  estimatedCostAtomic: string;
  toolPaymentReceiptId: string | null;
}

export interface StoredArtifact {
  contentHash: string;
  htmlPath: string;
  metadataPath: string;
  screenshotPath: null;
  byteLength: number;
}

function artifactDirectory(configuredPath = process.env.DRAFTPAY_ARTIFACT_PATH): string {
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  return configuredPath ? resolve(configuredPath) : resolve(workspaceRoot, ".demo", "artifacts");
}

async function writeOnce(path: string, contents: string): Promise<void> {
  try {
    await writeFile(path, contents, { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "EEXIST") throw cause;
  }
}

/** Stores verified public artifact bytes; screenshot capture is deliberately reported as absent. */
export async function storeArtifact(
  evidence: ArtifactEvidence,
  configuredPath = process.env.DRAFTPAY_ARTIFACT_PATH,
): Promise<StoredArtifact> {
  const contentHash = hashSchema.parse(evidence.contentHash).toLowerCase();
  if (evidence.html.length > 500_000) throw new Error("Artifact exceeds the 500KB limit");
  const directory = artifactDirectory(configuredPath);
  await mkdir(directory, { recursive: true });
  const basename = contentHash.slice(2);
  const htmlPath = resolve(directory, `${basename}.html`);
  const metadataPath = resolve(directory, `${basename}.json`);
  const byteLength = Buffer.byteLength(evidence.html, "utf8");
  await writeOnce(htmlPath, evidence.html);
  await writeOnce(
    metadataPath,
    `${JSON.stringify(
      {
        contentHash,
        mode: evidence.mode,
        providerLabel: evidence.providerLabel,
        byteLength,
        checks: evidence.checks,
        estimatedCostAtomic: evidence.estimatedCostAtomic,
        toolPaymentReceiptId: evidence.toolPaymentReceiptId,
        screenshot: { status: "not-captured", path: null },
      },
      null,
      2,
    )}\n`,
  );
  return { contentHash, htmlPath, metadataPath, screenshotPath: null, byteLength };
}

export async function readStoredArtifact(
  contentHashInput: string,
  configuredPath = process.env.DRAFTPAY_ARTIFACT_PATH,
): Promise<string> {
  const contentHash = hashSchema.parse(contentHashInput).toLowerCase();
  const path = resolve(artifactDirectory(configuredPath), `${contentHash.slice(2)}.html`);
  return readFile(path, "utf8");
}

export async function listStoredArtifactHashes(
  configuredPath = process.env.DRAFTPAY_ARTIFACT_PATH,
): Promise<string[]> {
  try {
    const entries = await readdir(artifactDirectory(configuredPath));
    return entries
      .filter((entry) => /^[a-f\d]{64}\.json$/i.test(entry))
      .map((entry) => `0x${entry.slice(0, -5).toLowerCase()}`);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw cause;
  }
}

export function artifactPublicUri(contentHashInput: string, baseUrl: string | undefined): string {
  const contentHash = hashSchema.parse(contentHashInput).toLowerCase();
  if (!baseUrl) return `draftpay://artifact/${contentHash}`;
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
    throw new Error("AGENT_ARTIFACT_BASE_URL must use HTTPS outside localhost");
  }
  return `${parsed.toString().replace(/\/$/, "")}/api/artifacts/${contentHash}`;
}

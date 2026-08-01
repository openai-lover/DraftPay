import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { keccak256, toBytes } from "viem";
import {
  artifactPublicUri,
  listStoredArtifactHashes,
  readStoredArtifact,
  storeArtifact,
} from "./artifact-store";

let directory: string | null = null;

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = null;
});

describe("artifact evidence store", () => {
  it("stores exact HTML bytes and truthful screenshot status", async () => {
    directory = await mkdtemp(join(tmpdir(), "draftpay-artifact-"));
    const html = '<!doctype html><html lang="en"><body>verified artifact</body></html>';
    const contentHash = keccak256(toBytes(html));
    const stored = await storeArtifact(
      {
        contentHash,
        html,
        mode: "fixture",
        providerLabel: "test fixture",
        checks: [],
        estimatedCostAtomic: "0",
        toolPaymentReceiptId: null,
      },
      directory,
    );
    expect(await readStoredArtifact(contentHash, directory)).toBe(html);
    expect(await listStoredArtifactHashes(directory)).toEqual([contentHash]);
    expect(stored.screenshotPath).toBeNull();
    expect(await readFile(stored.metadataPath, "utf8")).toContain('"status": "not-captured"');
  });

  it("requires HTTPS for a remotely retrievable proof URI", () => {
    const hash = `0x${"11".repeat(32)}`;
    expect(() => artifactPublicUri(hash, "http://example.com")).toThrow("HTTPS");
    expect(artifactPublicUri(hash, "https://demo.example")).toContain("/api/artifacts/");
  });
});

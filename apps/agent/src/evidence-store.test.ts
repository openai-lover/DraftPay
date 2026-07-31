import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { appendEvidence } from "./evidence-store";

let directory: string | null = null;

afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true });
  directory = null;
});

describe("minimal evidence store", () => {
  it("appends labeled public evidence without inventing a payment", async () => {
    directory = await mkdtemp(join(tmpdir(), "draftpay-evidence-"));
    const path = join(directory, "evidence.jsonl");
    await appendEvidence(
      {
        kind: "tool-payment",
        mode: "fixture",
        payload: { paymentOccurred: false, amountAtomic: "0" },
      },
      path,
    );
    const record = JSON.parse((await readFile(path, "utf8")).trim()) as {
      kind: string;
      mode: string;
      payload: { paymentOccurred: boolean };
    };
    expect(record.kind).toBe("tool-payment");
    expect(record.mode).toBe("fixture");
    expect(record.payload.paymentOccurred).toBe(false);
  });
});

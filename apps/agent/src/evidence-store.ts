import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

export type EvidenceRecord =
  | {
      kind: "agent-decision";
      mode: "fixture" | "real";
      payload: Record<string, unknown>;
    }
  | {
      kind: "tool-payment";
      mode: "fixture" | "real";
      payload: Record<string, unknown>;
    }
  | {
      kind: "chain-transaction";
      mode: "real";
      payload: Record<string, unknown>;
    };

function jsonValue(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

/** Append-only local evidence for the focused demo. It stores public facts only, never keys. */
export async function appendEvidence(
  record: EvidenceRecord,
  configuredPath = process.env.DRAFTPAY_EVIDENCE_PATH,
): Promise<void> {
  const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const path = configuredPath
    ? resolve(configuredPath)
    : resolve(workspaceRoot, ".demo", "evidence.jsonl");
  await mkdir(dirname(path), { recursive: true });
  const storedRecord = {
    ...record,
    id: randomUUID(),
    recordedAt: new Date().toISOString(),
  };
  await appendFile(path, `${JSON.stringify(storedRecord, jsonValue)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

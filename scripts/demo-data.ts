import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, toBytes } from "viem";
import { preparedArtifacts } from "../packages/shared/src/prepared-artifacts";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const demoDirectory = join(workspaceRoot, ".demo");
const seedPath = join(demoDirectory, "seed.json");
const evidencePath = join(demoDirectory, "evidence.jsonl");
const artifactDirectory = join(demoDirectory, "artifacts");
const artifacts = [
  { id: "submission-1", slug: "northstar" },
  { id: "submission-2", slug: "mina" },
  { id: "submission-3", slug: "kite" },
] as const;

const command = process.argv[2];
if (command === "seed") {
  const submissions = await Promise.all(
    artifacts.map(async (artifact) => {
      const html = preparedArtifacts[artifact.slug];
      return {
        id: artifact.id,
        slug: artifact.slug,
        artifactPath: `packages/shared/src/prepared-artifacts.ts#${artifact.slug}`,
        byteSize: toBytes(html).byteLength,
        contentHash: keccak256(toBytes(html)),
      };
    }),
  );
  await mkdir(demoDirectory, { recursive: true });
  await writeFile(
    seedPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        evidenceMode: "fixture",
        paymentOccurred: false,
        transactionHashes: [],
        submissions,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  console.log(`Seeded reproducible fixture evidence at ${seedPath}`);
} else if (command === "reset") {
  await Promise.all([
    rm(seedPath, { force: true }),
    rm(evidencePath, { force: true }),
    rm(artifactDirectory, { recursive: true, force: true }),
  ]);
  console.log(`Removed generated fixture evidence from ${demoDirectory}`);
} else {
  throw new Error("Usage: pnpm demo:seed | pnpm demo:reset");
}

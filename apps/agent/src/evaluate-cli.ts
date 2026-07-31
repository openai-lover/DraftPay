import { readFile } from "node:fs/promises";
import type { Hex } from "viem";
import { z } from "zod";
import { evaluateContestOnArc } from "./evaluate-onchain";

const inputSchema = z.array(
  z.object({
    submissionId: z.string().regex(/^\d+$/),
    qualified: z.boolean(),
    score: z.number().int().min(0).max(100),
    hardChecks: z.array(
      z.object({ id: z.string().min(1), passed: z.boolean(), detail: z.string().min(1) }),
    ),
  }),
);

const contestAddress = process.env.EVALUATOR_CONTEST_ADDRESS;
const privateKey = process.env.EVALUATOR_PRIVATE_KEY;
const inputPath = process.env.EVALUATION_INPUT_PATH;
if (!contestAddress) throw new Error("EVALUATOR_CONTEST_ADDRESS is required");
if (!privateKey || !/^0x[\da-fA-F]{64}$/.test(privateKey)) {
  throw new Error("A valid server-only EVALUATOR_PRIVATE_KEY is required");
}
if (!inputPath) throw new Error("EVALUATION_INPUT_PATH is required");

const parsed = inputSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
const result = await evaluateContestOnArc({
  contestAddress,
  privateKey: privateKey as Hex,
  assessments: parsed.map((assessment) => ({
    ...assessment,
    submissionId: BigInt(assessment.submissionId),
  })),
});
console.log(JSON.stringify(result, null, 2));

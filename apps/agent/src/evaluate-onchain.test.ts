import { describe, expect, it } from "vitest";
import { evaluateContestOnArc, type EvaluationAssessment } from "./evaluate-onchain";

const base: EvaluationAssessment = {
  submissionId: 1n,
  qualified: true,
  score: 90,
  hardChecks: [{ id: "loads", passed: true, detail: "Loaded" }],
};
const input = {
  contestAddress: "0x1111111111111111111111111111111111111111",
  privateKey: `0x${"11".repeat(32)}` as const,
};

describe("onchain evaluator preflight", () => {
  it("allows arbitrary rejections but caps qualified finalists at three", async () => {
    await expect(
      evaluateContestOnArc({
        ...input,
        assessments: Array.from({ length: 4 }, (_, index) => ({
          ...base,
          submissionId: BigInt(index + 1),
          qualified: true,
        })),
      }),
    ).rejects.toThrow("At most three");
  });

  it("rejects duplicate submission IDs before making an RPC request", async () => {
    await expect(
      evaluateContestOnArc({ ...input, assessments: [base, { ...base, score: 80 }] }),
    ).rejects.toThrow("unique");
  });
});

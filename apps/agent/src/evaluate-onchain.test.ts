import { describe, expect, it } from "vitest";
import {
  MAX_FINALISTS,
  evaluateContestOnArc,
  selectFinalistSeats,
  type EvaluationAssessment,
} from "./evaluate-onchain";

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
  it("seats the highest-scoring qualified work when more than three qualify", () => {
    const assessments: EvaluationAssessment[] = [
      { ...base, submissionId: 1n, score: 71 },
      { ...base, submissionId: 2n, score: 95 },
      { ...base, submissionId: 3n, score: 60 },
      { ...base, submissionId: 4n, score: 88 },
    ];
    const seats = selectFinalistSeats(assessments);
    expect(seats).toHaveLength(MAX_FINALISTS);
    expect(seats).toEqual([2n, 4n, 1n]);
  });

  it("does not reject a contest just because a fourth submission qualified", async () => {
    await expect(
      evaluateContestOnArc({
        ...input,
        assessments: Array.from({ length: 4 }, (_, index) => ({
          ...base,
          submissionId: BigInt(index + 1),
          qualified: true,
        })),
      }),
    ).rejects.not.toThrow(/At most three/);
  });

  it("rejects duplicate submission IDs before making an RPC request", async () => {
    await expect(
      evaluateContestOnArc({ ...input, assessments: [base, { ...base, score: 80 }] }),
    ).rejects.toThrow("unique");
  });
});

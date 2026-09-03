import { describe, expect, it } from "vitest";
import {
  availableLifecycleActions,
  hashEvidence,
  parsePositiveSubmissionId,
  parseRankedSubmissionIds,
  resolveArtifactUri,
  type LifecycleActionInput,
} from "./lifecycle-lab";

const base: LifecycleActionInput = {
  connected: true,
  contractVerified: true,
  state: 1,
  chainNow: 100n,
  submissionDeadline: 200n,
  selectionDeadline: 300n,
  isClient: true,
  isEvaluator: true,
  allSubmissionsEvaluated: false,
  finalistCount: 0,
};

describe("lifecycle lab validation", () => {
  it("parses positive and unique submission IDs", () => {
    expect(parsePositiveSubmissionId(" 2 ")).toBe(2n);
    expect(parseRankedSubmissionIds("3, 1, 2")).toEqual([3n, 1n, 2n]);
    expect(parseRankedSubmissionIds("")).toEqual([]);
    expect(() => parsePositiveSubmissionId("0")).toThrow(/positive/);
    expect(() => parseRankedSubmissionIds("1,1")).toThrow(/unique/);
    expect(() => parseRankedSubmissionIds("1,2,3,4")).toThrow(/at most three/);
  });

  it("enforces HTTPS and the UTF-8 contract byte limit", () => {
    expect(resolveArtifactUri(" /work ", "https://example.com")).toBe("https://example.com/work");
    expect(() => resolveArtifactUri("/work", "http://example.com")).toThrow(/HTTPS/);
    expect(() => resolveArtifactUri("https://other.example/work", "https://example.com")).toThrow(
      /this DraftPay origin/,
    );
    expect(resolveArtifactUri(`/${"a".repeat(235)}`, "https://x.dev")).toHaveLength(249);
    expect(() => resolveArtifactUri(`/${"가".repeat(82)}`, "https://x.dev")).toThrow(/256-byte/);
  });

  it("hashes normalized, non-empty evidence", () => {
    expect(hashEvidence(" proof ", "Evidence")).toBe(hashEvidence("proof", "Evidence"));
    expect(() => hashEvidence("   ", "Evidence")).toThrow(/required/);
  });
});

describe("lifecycle action boundaries", () => {
  it("allows submission only before the submission deadline", () => {
    expect(availableLifecycleActions(base).submit).toBe(true);
    expect(availableLifecycleActions({ ...base, chainNow: 200n }).submit).toBe(false);
  });

  it("opens evaluation after submission close and blocks writes at selection close", () => {
    expect(availableLifecycleActions({ ...base, chainNow: 200n }).beginEvaluation).toBe(true);
    expect(availableLifecycleActions({ ...base, state: 2, chainNow: 299n }).evaluate).toBe(true);
    expect(availableLifecycleActions({ ...base, state: 2, chainNow: 300n }).evaluate).toBe(false);
  });

  it("requires every submission to be evaluated before ranking", () => {
    expect(availableLifecycleActions({ ...base, state: 2, chainNow: 250n }).rank).toBe(false);
    expect(
      availableLifecycleActions({
        ...base,
        state: 2,
        chainNow: 250n,
        allSubmissionsEvaluated: true,
      }).rank,
    ).toBe(true);
  });

  it("supports client rejection and strictly post-deadline permissionless settlement", () => {
    expect(availableLifecycleActions({ ...base, state: 3, chainNow: 250n }).settleNoWinner).toBe(
      true,
    );
    expect(
      availableLifecycleActions({
        ...base,
        state: 2,
        chainNow: 300n,
        isClient: false,
        isEvaluator: false,
      }).settleNoWinner,
    ).toBe(false);
    expect(
      availableLifecycleActions({
        ...base,
        state: 2,
        chainNow: 301n,
        isClient: false,
        isEvaluator: false,
      }).settleNoWinner,
    ).toBe(true);
  });

  it("fails closed when disconnected or contract verification fails", () => {
    expect(Object.values(availableLifecycleActions({ ...base, connected: false }))).not.toContain(
      true,
    );
    expect(
      Object.values(availableLifecycleActions({ ...base, contractVerified: false })),
    ).not.toContain(true);
  });
});

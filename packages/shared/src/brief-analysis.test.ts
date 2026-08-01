import { describe, expect, it } from "vitest";
import {
  analyzeBrief,
  calibrateQualificationProbability,
  MIN_CALIBRATED_PROBABILITY_BPS,
} from "./brief-analysis";
import { canonicalJson } from "./specification";

describe("brief analysis", () => {
  it("returns useful deterministic cost and risk inputs", () => {
    const result = analyzeBrief({
      brief: "Build a mobile responsive hero and pricing page with a contact form.",
      requirements: ["Primary call to action", "No external scripts"],
    });
    expect(result.missingRequirements).toEqual([]);
    expect(BigInt(result.estimatedBuildCostAtomic)).toBeGreaterThan(0n);
    expect(result.riskScore).toBeLessThan(50);
  });

  it("raises risk when required detail is absent", () => {
    const result = analyzeBrief({
      brief: "Make a polished marketing page with the supplied brand direction.",
      requirements: ["Use a warm white background"],
    });
    expect(result.missingRequirements.length).toBeGreaterThan(2);
    expect(result.riskScore).toBeGreaterThan(50);
  });
});

describe("qualification probability calibration", () => {
  it("lowers a clean brief only by its risk and complexity", () => {
    const analysis = analyzeBrief({
      brief: "Build a mobile responsive hero and pricing page with a contact form.",
      requirements: ["Primary call to action", "No external scripts"],
    });
    const calibrated = calibrateQualificationProbability(7_200, analysis);
    expect(calibrated.baseBps).toBe(7_200);
    expect(calibrated.adjustedBps).toBeLessThan(7_200);
    expect(calibrated.adjustedBps).toBeGreaterThan(5_000);
    expect(calibrated.adjustments.every((adjustment) => adjustment.deltaBps < 0)).toBe(true);
  });

  it("collapses the probability when the paid analysis reports missing requirements", () => {
    const vague = analyzeBrief({
      brief: "Make a polished marketing page with the supplied brand direction.",
      requirements: ["Use a warm white background"],
    });
    const clean = analyzeBrief({
      brief: "Build a mobile responsive hero and pricing page with a contact form.",
      requirements: ["Primary call to action", "No external scripts"],
    });
    expect(calibrateQualificationProbability(7_200, vague).adjustedBps).toBeLessThan(
      calibrateQualificationProbability(7_200, clean).adjustedBps,
    );
    expect(calibrateQualificationProbability(7_200, vague).adjustedBps).toBeLessThan(3_000);
  });

  it("never reports a probability below the floor", () => {
    const worstCase = calibrateQualificationProbability(5_000, {
      complexity: "high",
      missingRequirements: ["hero", "pricing", "call to action", "contact form", "mobile"],
      estimatedBuildCostAtomic: "180000",
      estimatedBuildMinutes: 28,
      riskScore: 95,
    });
    expect(worstCase.adjustedBps).toBe(MIN_CALIBRATED_PROBABILITY_BPS);
  });

  it("rejects a prior that is not integer basis points", () => {
    const analysis = analyzeBrief({
      brief: "Build a mobile responsive hero and pricing page with a contact form.",
      requirements: ["Primary call to action"],
    });
    expect(() => calibrateQualificationProbability(72.5, analysis)).toThrow();
    expect(() => calibrateQualificationProbability(10_001, analysis)).toThrow();
  });
});

describe("canonical contest metadata", () => {
  it("produces the same bytes regardless of object key insertion order", () => {
    expect(canonicalJson({ b: 2, a: { z: 1, y: true } })).toBe(
      canonicalJson({ a: { y: true, z: 1 }, b: 2 }),
    );
  });
});

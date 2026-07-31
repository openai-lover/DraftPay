import { describe, expect, it } from "vitest";
import { analyzeBrief } from "./brief-analysis";
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

describe("canonical contest metadata", () => {
  it("produces the same bytes regardless of object key insertion order", () => {
    expect(canonicalJson({ b: 2, a: { z: 1, y: true } })).toBe(
      canonicalJson({ a: { y: true, z: 1 }, b: 2 }),
    );
  });
});

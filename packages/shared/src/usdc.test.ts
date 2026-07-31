import { describe, expect, it } from "vitest";
import { formatUsdc, multiplyBps, parseUsdc } from "./usdc";

describe("exact USDC helpers", () => {
  it("parses and formats six-decimal amounts", () => {
    expect(parseUsdc("100")).toBe(100_000_000n);
    expect(parseUsdc("0.000001")).toBe(1n);
    expect(formatUsdc(2_500_000n)).toBe("2.5");
    expect(formatUsdc(2_500_000n, { trim: false })).toBe("2.500000");
  });

  it("rejects imprecise or malformed amounts", () => {
    expect(() => parseUsdc("1.0000001")).toThrow();
    expect(() => parseUsdc("-1")).toThrow();
    expect(() => parseUsdc("1e6")).toThrow();
  });

  it("uses integer basis-point math", () => {
    expect(multiplyBps(100_000_000n, 9_500)).toBe(95_000_000n);
    expect(multiplyBps(101n, 9_500)).toBe(95n);
  });
});

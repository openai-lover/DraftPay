import { describe, expect, it } from "vitest";
import { noWinnerPayouts, winnerPayouts } from "./settlement";

describe("settlement presentation math", () => {
  it("matches contract winner rules", () => {
    expect(winnerPayouts(100_000_000n, 3)).toEqual([95_000_000n, 2_500_000n, 2_500_000n]);
    expect(winnerPayouts(100_000_000n, 1)).toEqual([100_000_000n]);
  });

  it("matches contract no-winner rules", () => {
    expect(noWinnerPayouts(100_000_000n, 3)).toEqual([
      70_000_000n,
      15_000_000n,
      10_000_000n,
      5_000_000n,
    ]);
    expect(noWinnerPayouts(100_000_000n, 1)).toEqual([85_000_000n, 15_000_000n]);
  });
});

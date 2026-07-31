import { describe, expect, it } from "vitest";
import { createDemoContest } from "./fixtures";

describe("demo contest", () => {
  it("keeps the fixture submission and selection windows ahead of the demo clock", () => {
    const now = new Date("2028-04-12T09:30:00.000Z");
    const contest = createDemoContest(now);

    expect(new Date(contest.submissionDeadline).getTime() - now.getTime()).toBe(
      22 * 60 * 60 * 1_000,
    );
    expect(new Date(contest.selectionDeadline).getTime() - now.getTime()).toBe(
      46 * 60 * 60 * 1_000,
    );
  });
});

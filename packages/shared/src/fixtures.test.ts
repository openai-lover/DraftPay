import { describe, expect, it } from "vitest";
import { createDemoContest, createDemoContests, createDemoMarketplaceActivity } from "./fixtures";

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

  it("offers a varied but explicitly fixture-only marketplace", () => {
    const contests = createDemoContests(new Date("2028-04-12T09:30:00.000Z"));

    expect(contests).toHaveLength(5);
    expect(new Set(contests.map((contest) => contest.id)).size).toBe(5);
    expect(new Set(contests.map((contest) => contest.state))).toEqual(
      new Set(["submission-open", "evaluation", "awaiting-selection", "settled-with-winner"]),
    );
    expect(
      contests.every(
        (contest) =>
          contest.mode === "fixture" &&
          contest.contractAddress === null &&
          contest.fundingTransactionHash === null,
      ),
    ).toBe(true);
  });

  it("keeps recent marketplace activity ordered and fixture-labeled", () => {
    const activity = createDemoMarketplaceActivity(new Date("2028-04-12T09:30:00.000Z"));

    expect(activity).toHaveLength(7);
    expect(activity.every((item) => item.mode === "fixture")).toBe(true);
    expect(activity.map((item) => Date.parse(item.occurredAt))).toEqual(
      [...activity].map((item) => Date.parse(item.occurredAt)).sort((left, right) => right - left),
    );
  });
});

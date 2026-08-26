import { describe, expect, it } from "vitest";
import { effectiveContestStatus, isSelectionDeadlinePassed } from "./contest-status";

describe("effectiveContestStatus", () => {
  it("keeps the raw state immediately before the submission deadline", () => {
    expect(
      effectiveContestStatus({
        state: 1,
        submissionDeadline: 100,
        selectionDeadline: 200,
        nowSeconds: 99,
      }),
    ).toBe("Submission open");
  });

  it("closes submissions exactly at the submission deadline", () => {
    expect(
      effectiveContestStatus({
        state: 1,
        submissionDeadline: 100,
        selectionDeadline: 200,
        nowSeconds: 100,
      }),
    ).toBe("Submission window closed · awaiting evaluation");
  });

  it("does not advertise permissionless settlement until after the selection deadline", () => {
    expect(
      effectiveContestStatus({
        state: 3,
        submissionDeadline: 100,
        selectionDeadline: 200,
        nowSeconds: 200,
      }),
    ).toBe("Awaiting selection");
  });

  it("advertises settlement once the selection deadline has passed", () => {
    expect(
      effectiveContestStatus({
        state: 1,
        submissionDeadline: 100,
        selectionDeadline: 200,
        nowSeconds: 201,
      }),
    ).toBe("Selection deadline passed · settlement available");
  });
});

describe("isSelectionDeadlinePassed", () => {
  it("changes only after the contract deadline boundary", () => {
    expect(isSelectionDeadlinePassed(199, 200n)).toBe(false);
    expect(isSelectionDeadlinePassed(200, 200n)).toBe(false);
    expect(isSelectionDeadlinePassed(201, 200n)).toBe(true);
  });
});

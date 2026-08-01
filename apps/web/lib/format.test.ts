import { describe, expect, it } from "vitest";
import { relativeTime } from "./format";

describe("relativeTime", () => {
  const now = new Date("2028-04-12T09:30:00.000Z");

  it("formats recent minutes and hours", () => {
    expect(relativeTime("2028-04-12T09:26:00.000Z", now)).toBe("4m ago");
    expect(relativeTime("2028-04-12T07:30:00.000Z", now)).toBe("2h ago");
  });

  it("formats older activity in days", () => {
    expect(relativeTime("2028-04-10T09:30:00.000Z", now)).toBe("2d ago");
  });
});

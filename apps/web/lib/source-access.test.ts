import { describe, expect, it } from "vitest";
import {
  formatSourceChallenge,
  isSourceChallengeFresh,
  issueSourceChallenge,
} from "./source-access";

describe("winner source access challenge", () => {
  const input = {
    address: "0x1111111111111111111111111111111111111111",
    contest: "0x2222222222222222222222222222222222222222",
    transactionHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
    submissionId: "17",
  };

  it("binds evidence fields in a short-lived stateless challenge", () => {
    const issued = issueSourceChallenge(input, 1_000_000);
    expect(issued.message).toContain("DraftPay source access");
    expect(issued.message).toContain("Winner submission: 17");
    expect(isSourceChallengeFresh(issued, 1_000_001)).toBe(true);
    expect(formatSourceChallenge(issued)).toBe(issued.message);
  });

  it("rejects an expired challenge", () => {
    const issued = issueSourceChallenge(input, 1_000_000);
    expect(isSourceChallengeFresh(issued, 1_000_000 + 5 * 60_000)).toBe(false);
  });

  it("changes the signed message when a bound field is altered", () => {
    const issued = issueSourceChallenge(input, 1_000_000);
    expect(formatSourceChallenge({ ...issued, submissionId: "18" })).not.toBe(issued.message);
  });
});

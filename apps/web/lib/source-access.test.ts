import { describe, expect, it } from "vitest";
import { consumeSourceChallenge, issueSourceChallenge } from "./source-access";

describe("winner source access challenge", () => {
  it("binds evidence fields and can be consumed only once", () => {
    const issued = issueSourceChallenge({
      address: "0x1111111111111111111111111111111111111111",
      contest: "0x2222222222222222222222222222222222222222",
      transactionHash: "0x3333333333333333333333333333333333333333333333333333333333333333",
      submissionId: "17",
    });
    expect(issued.message).toContain("DraftPay source access");
    expect(issued.message).toContain("Winner submission: 17");

    const consumed = consumeSourceChallenge(issued.nonce);
    expect(consumed?.transactionHash).toBe(
      "0x3333333333333333333333333333333333333333333333333333333333333333",
    );
    expect(consumeSourceChallenge(issued.nonce)).toBeNull();
  });
});

import { ARC_TESTNET_USDC_ADDRESS } from "@draftpay/chain";
import {
  approvedContestMetadataSchema,
  canonicalJson,
  type ApprovedContestMetadata,
} from "@draftpay/shared";
import { describe, expect, it } from "vitest";
import { getAddress, keccak256, toBytes } from "viem";
import { contestSummaryFromSnapshot, type ContestSnapshot } from "./read-contest";

const metadata: ApprovedContestMetadata = approvedContestMetadataSchema.parse({
  specification: {
    category: "responsive-landing-page",
    title: "Build a verified launch page",
    brief: "Build a responsive launch page with a hero, pricing, call to action, and contact form.",
    requiredHeadline: "Close the books without closing your weekend.",
    requirements: [
      { id: "hero", label: "Hero", kind: "section", required: true },
      { id: "pricing", label: "Pricing", kind: "section", required: true },
      { id: "cta", label: "CTA", kind: "interaction", required: true },
      { id: "contact", label: "Contact", kind: "interaction", required: true },
    ],
    responsiveBreakpoints: [390, 680, 1120],
    accessibilityExpectations: ["Document language and labeled form controls"],
    scoringRubric: [
      { id: "requirements", label: "Objective requirements", weightBps: 5_000 },
      { id: "clarity", label: "Visual clarity", weightBps: 3_000 },
      { id: "craft", label: "Responsive craft", weightBps: 2_000 },
    ],
    approved: true,
  },
  prizeAtomic: "100000000",
  submissionDeadlineEpochSeconds: 1_900_000_000,
  selectionDeadlineEpochSeconds: 1_900_086_400,
});

const snapshot: ContestSnapshot = {
  token: ARC_TESTNET_USDC_ADDRESS,
  prize: 100_000_000n,
  submissionDeadline: 1_900_000_000n,
  selectionDeadline: 1_900_086_400n,
  specificationHash: keccak256(toBytes(canonicalJson(metadata))),
  state: 1,
  qualifiedCount: 0,
};

describe("Arc contest decision input", () => {
  it("builds a real contest only after all economic inputs match", () => {
    const result = contestSummaryFromSnapshot(
      getAddress("0x1111111111111111111111111111111111111111"),
      metadata,
      snapshot,
    );
    expect(result.mode).toBe("real");
    expect(result.prizeAtomic).toBe("100000000");
    expect(result.state).toBe("submission-open");
  });

  it("rejects metadata whose prize does not match Arc", () => {
    expect(() =>
      contestSummaryFromSnapshot(
        getAddress("0x1111111111111111111111111111111111111111"),
        { ...metadata, prizeAtomic: "99000000" },
        snapshot,
      ),
    ).toThrow("prize does not match");
  });

  it("rejects an unbound specification hash", () => {
    expect(() =>
      contestSummaryFromSnapshot(
        getAddress("0x1111111111111111111111111111111111111111"),
        metadata,
        { ...snapshot, specificationHash: `0x${"00".repeat(32)}` },
      ),
    ).toThrow("metadata hash does not match");
  });
});

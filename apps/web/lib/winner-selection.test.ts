import { describe, expect, it } from "vitest";
import {
  winnerSelectionDisabledReason,
  type WinnerSelectionAvailability,
} from "./winner-selection";

const client = "0x1111111111111111111111111111111111111111";

function availability(
  overrides: Partial<WinnerSelectionAvailability> = {},
): WinnerSelectionAvailability {
  return {
    hasContestAddress: true,
    contractReadStatus: "ready",
    contractState: 3,
    contractClient: client,
    selectionDeadline: 200n,
    nowSeconds: 199n,
    accountAddress: client,
    isConnected: true,
    chainId: 5_042_002,
    finalistsStatus: "ready",
    hasSelectedFinalist: true,
    hasPublicClient: true,
    transactionPending: false,
    ...overrides,
  };
}

describe("winnerSelectionDisabledReason", () => {
  it("allows the contest client to select an onchain finalist while state 3 is open", () => {
    expect(winnerSelectionDisabledReason(availability())).toBeNull();
  });

  it("fails closed exactly at the deadline because a new transaction cannot land reliably", () => {
    expect(winnerSelectionDisabledReason(availability({ nowSeconds: 200n }))).toMatch(
      /deadline has passed/i,
    );
  });

  it("fails closed until the client clock is ready", () => {
    expect(winnerSelectionDisabledReason(availability({ nowSeconds: 0n }))).toMatch(
      /checking the winner-selection deadline/i,
    );
  });

  it("blocks the settled final-run state", () => {
    expect(winnerSelectionDisabledReason(availability({ contractState: 4 }))).toBe(
      "This contest is already settled with a winner. No further winner can be selected.",
    );
  });

  it("fails closed when any eligibility read cannot be verified", () => {
    expect(winnerSelectionDisabledReason(availability({ contractReadStatus: "error" }))).toMatch(
      /could not verify the contest state, client, and selection deadline/i,
    );
  });

  it("blocks a wallet that is not the contract client", () => {
    expect(
      winnerSelectionDisabledReason(
        availability({ accountAddress: "0x2222222222222222222222222222222222222222" }),
      ),
    ).toMatch(/only the contest client/i);
  });

  it("blocks selection when the client wallet is not connected", () => {
    expect(
      winnerSelectionDisabledReason(
        availability({ accountAddress: undefined, isConnected: false }),
      ),
    ).toMatch(/connect the contest client wallet/i);
  });

  it("blocks selection after the deadline", () => {
    expect(winnerSelectionDisabledReason(availability({ nowSeconds: 201n }))).toMatch(
      /deadline has passed/i,
    );
  });

  it("does not trust recorded finalists when the live finalist read fails", () => {
    expect(winnerSelectionDisabledReason(availability({ finalistsStatus: "error" }))).toMatch(
      /could not be verified from Arc/i,
    );
  });
});

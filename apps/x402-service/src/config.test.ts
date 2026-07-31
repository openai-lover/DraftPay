import { describe, expect, it } from "vitest";
import { readServiceConfig } from "./config";

describe("x402 environment", () => {
  it("defaults to the explicit no-payment fixture mode", () => {
    expect(readServiceConfig({}).app.mode).toBe("fixture");
  });

  it("requires a seller for real payment mode", () => {
    expect(() => readServiceConfig({ X402_MODE: "real" })).toThrow("X402_SELLER_ADDRESS");
  });

  it("rejects an invalid listening port", () => {
    expect(() => readServiceConfig({ PORT: "70000" })).toThrow();
  });
});

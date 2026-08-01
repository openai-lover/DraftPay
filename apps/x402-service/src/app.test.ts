import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "./app";

const servers: Array<ReturnType<ReturnType<typeof createApp>["listen"]>> = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  );
});

async function startFixtureServer() {
  const app = createApp({
    mode: "fixture",
    facilitatorUrl: "https://gateway-api-testnet.circle.com",
    price: "$0.01",
  });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function startRealServer() {
  const app = createApp({
    mode: "real",
    sellerAddress: "0x0118c54a58F86B2C11e9A8c4a744956974c134CC",
    facilitatorUrl: "https://gateway-api-testnet.circle.com",
    price: "$0.01",
  });
  const server = app.listen(0, "127.0.0.1");
  servers.push(server);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

describe("x402 brief service", () => {
  it("does not pretend fixture mode is a paid endpoint", async () => {
    const origin = await startFixtureServer();
    const paid = await fetch(`${origin}/x402/brief-analysis`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        brief: "A sufficiently detailed landing page brief for testing.",
        requirements: ["hero"],
      }),
    });
    expect(paid.status).toBe(503);
    expect(await paid.json()).toMatchObject({ paymentOccurred: false });
  });

  it("labels deterministic fixture analysis", async () => {
    const origin = await startFixtureServer();
    const response = await fetch(`${origin}/fixture/brief-analysis`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        brief: "Build a hero, pricing section, contact form, and mobile call to action.",
        requirements: ["No external scripts"],
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("x-draftpay-evidence-mode")).toBe("fixture");
    expect(await response.json()).toMatchObject({ missingRequirements: [] });
  });

  it("rejects an invalid real request before advertising or settling payment", async () => {
    const origin = await startRealServer();
    const response = await fetch(`${origin}/x402/brief-analysis`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ brief: "too short", requirements: [] }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("payment-required")).toBeNull();
    expect(await response.json()).toMatchObject({ error: "Invalid brief analysis request" });
  });
});

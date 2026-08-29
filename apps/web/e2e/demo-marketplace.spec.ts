import { expect, test } from "@playwright/test";

test("wallet chooser supports MetaMask mobile when no extension is installed", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Connect wallet" }).click();

  const chooser = page.getByRole("dialog", { name: "Connect an Arc Testnet wallet" });
  await expect(chooser).toBeVisible();
  await expect(chooser.getByRole("button", { name: /MetaMask/ })).toBeEnabled();
  await expect(chooser.getByRole("button", { name: /Browser wallet/ })).toBeDisabled();
  await expect(chooser.getByText("Chain ID 5,042,002")).toBeVisible();
  await expect(chooser.getByRole("link", { name: "Get Arc Testnet USDC" })).toHaveAttribute(
    "href",
    "https://faucet-v2.circle.com/",
  );
});

test("live proof and seeded marketplace are clearly separated", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Every handoff has a receipt/ })).toBeVisible();
  await expect(page.getByText("This is not seeded UI", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inspect winner settlement" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Inspect 15 / 10 / 5 settlement" })).toBeVisible();

  await page.goto("/contests");
  await expect(page.getByRole("heading", { name: "Build a SaaS launch page" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Launch an Arc-native treasury dashboard" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reframe a DeFi risk report" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ship the OrbitPay developer launch" }),
  ).toBeVisible();
  await expect(page.getByText("Illustrative fixture data", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Open Ship the OrbitPay developer launch" }).click();
  await expect(page.getByText("Winner preview", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Fixture only · no deployed contract")).toBeVisible();
  await expect(page.getByText("No wallet payment", { exact: false })).toBeVisible();
});

test("judge proof room links real settlement evidence and labels fixtures", async ({ page }) => {
  await page.goto("/proof");

  await expect(
    page.getByRole("heading", { name: "Audit the product, not the pitch." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Arc and Circle targets, verified at request time." }),
  ).toBeVisible();
  await expect(page.getByText("Exactly what is live—and what is not.")).toBeVisible();
  await expect(page.getByText("Verified onchain", { exact: true })).toBeVisible();
  await expect(page.getByText("Settled", { exact: true })).toBeVisible();
  await expect(page.getByText("Mixed evidence", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open public evidence" })).toHaveAttribute(
    "href",
    "/evidence/final-run.json",
  );
  await expect(page.getByText("pnpm quality", { exact: true })).toBeVisible();
});

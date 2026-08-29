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

test("seeded demo marketplace shows varied activity without claiming real evidence", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A marketplace that already has a rhythm." }),
  ).toBeVisible();
  await expect(page.getByText("Seeded demo data", { exact: false }).first()).toBeVisible();

  await page.goto("/contests");
  await expect(page.getByRole("heading", { name: "Build a SaaS launch page" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Launch an Arc-native treasury dashboard" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reframe a DeFi risk report" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Ship the OrbitPay developer launch" }),
  ).toBeVisible();
  await expect(page.getByText("Seeded demo data", { exact: false })).toBeVisible();

  await page.getByRole("link", { name: "Open Ship the OrbitPay developer launch" }).click();
  await expect(page.getByText("Winner preview", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Not deployed in fixture mode")).toBeVisible();
  await expect(page.getByText("No wallet payment", { exact: false })).toBeVisible();
});

test("judge proof room separates live, integration-ready, and fixture evidence", async ({
  page,
}) => {
  await page.goto("/proof");

  await expect(
    page.getByRole("heading", { name: "Audit the product, not the pitch." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Arc and Circle targets, verified at request time." }),
  ).toBeVisible();
  await expect(page.getByText("Exactly what is live—and what is not.")).toBeVisible();
  await expect(page.getByText("Fixture", { exact: true })).toBeVisible();
  await expect(page.getByText("Integration ready", { exact: true })).toBeVisible();
  await expect(page.getByText("pnpm quality", { exact: true })).toBeVisible();
});

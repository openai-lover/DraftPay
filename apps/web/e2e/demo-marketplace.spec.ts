import { expect, test } from "@playwright/test";

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

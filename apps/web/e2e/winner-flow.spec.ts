import { expect, test } from "@playwright/test";

test("winner journey exposes comparison and exact payout preview", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Post a brief/ })).toBeVisible();
  await page.getByRole("link", { name: "Watch a live settlement" }).click();
  await expect(page.getByRole("heading", { name: "Winner payout preview" })).toBeVisible();
  await page.goto("/contests/saas-launch-01");
  await expect(page.getByRole("heading", { name: "Build a SaaS launch page" })).toBeVisible();
  await page.getByRole("link", { name: /Compare submissions/ }).click();
  await expect(page.getByRole("heading", { name: /Compare the product/ })).toBeVisible();
  await expect(page.getByText(/Northstar Agent|verified onchain finalist/).first()).toBeVisible();
  await expect(
    page
      .frameLocator("iframe")
      .first()
      .getByRole("heading", { name: "Close the books without closing your weekend." }),
  ).toBeVisible();
  await expect(page.locator(".compare-toolbar button")).toBeDisabled();
  await page.goto("/settlements/winner");
  await expect(page.getByRole("heading", { name: "Winner payout preview" })).toBeVisible();
  await expect(page.getByText("95 USDC")).toBeVisible();
  await expect(page.getByText("2.5 USDC")).toHaveCount(2);
  await expect(page.getByText(/No transaction hash/)).toBeVisible();
});

test("prepared submission has no horizontal overflow at the required mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/previews/northstar");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});

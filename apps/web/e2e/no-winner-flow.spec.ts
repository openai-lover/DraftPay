import { expect, test } from "@playwright/test";

test("no-winner journey shows 70 / 15 / 10 / 5 effort protection", async ({ page }) => {
  await page.goto("/settlements/no-winner");
  await expect(page.getByRole("heading", { name: "Effort protected" })).toBeVisible();
  await expect(page.getByText("70 USDC")).toBeVisible();
  await expect(page.getByText("15 USDC")).toBeVisible();
  await expect(page.getByText("10 USDC")).toBeVisible();
  await expect(page.getByText("5 USDC", { exact: true })).toBeVisible();
  await expect(page.getByText("NoWinnerSettled")).toBeVisible();
  await expect(page.getByText(/Rule preview only/)).toBeVisible();
});

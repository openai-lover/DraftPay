import { expect, test } from "@playwright/test";

test("create flow requires specification approval and real deployment config", async ({ page }) => {
  await page.goto("/contests/new");
  await page.getByRole("button", { name: "Generate structured requirements" }).click();
  await expect(page.getByRole("heading", { name: "Structured requirements" })).toBeVisible();
  await page.getByRole("button", { name: "Approve specification" }).click();
  await expect(page.getByText("Approved for funding")).toBeVisible();
  await expect(page.getByRole("button", { name: "Deploy and fund on Arc" })).toBeDisabled();
  await expect(page.getByText(/No DraftPay factory is configured/)).toBeVisible();
  await expect(page.getByText(/Wallet disconnected/)).toBeVisible();
});

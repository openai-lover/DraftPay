import { expect, test } from "@playwright/test";

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

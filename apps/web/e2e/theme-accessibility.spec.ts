import { expect, test } from "@playwright/test";

test("low-glare theme keeps mobile navigation reachable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Explore" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Agent activity" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "Agent profile" })).toBeVisible();

  const shell = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    colorScheme: getComputedStyle(document.documentElement).colorScheme,
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));

  expect(shell.background).toBe("rgb(8, 17, 31)");
  expect(shell.colorScheme).toBe("dark");
  expect(shell.hasHorizontalOverflow).toBe(false);
});

test("Why Arc venue tabs support keyboard navigation", async ({ page }) => {
  await page.goto("/");

  const arcTab = page.getByRole("tab", { name: "Arc" });
  const l2Tab = page.getByRole("tab", { name: "General-purpose L2" });
  const panel = page.getByRole("tabpanel");

  await expect(arcTab).toHaveAttribute("aria-selected", "true");
  await arcTab.focus();
  await arcTab.press("ArrowLeft");
  await expect(l2Tab).toBeFocused();
  await expect(l2Tab).toHaveAttribute("aria-selected", "true");
  await expect(panel).toHaveAttribute("aria-labelledby", "venue-tab-l2");
});

test("prepared previews do not nest main landmarks", async ({ page }) => {
  await page.goto("/previews/northstar");
  await expect(page.locator("main")).toHaveCount(1);
});

test("unknown settlement outcomes fail closed", async ({ page }) => {
  const response = await page.goto("/settlements/not-a-real-outcome");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Winner payout preview")).toHaveCount(0);
});

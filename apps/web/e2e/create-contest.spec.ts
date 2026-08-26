import { expect, test, type Page } from "@playwright/test";

async function generateAndApprove(page: Page) {
  await page.getByRole("button", { name: "Generate structured requirements" }).click();
  await expect(page.getByRole("heading", { name: "Structured requirements" })).toBeVisible();
  await page.getByRole("button", { name: "Approve specification" }).click();
  await expect(page.getByText("Approved for funding")).toBeVisible();
}

function futureLocalDateTime(hours: number): string {
  const date = new Date(Date.now() + hours * 60 * 60 * 1_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1_000);
  return local.toISOString().slice(0, 16);
}

test("create flow requires specification approval and real deployment config", async ({ page }) => {
  await page.goto("/contests/new");
  await generateAndApprove(page);
  await expect(page.getByRole("button", { name: "Deploy and fund on Arc" })).toBeDisabled();
  await expect(page.getByText(/Wallet disconnected/)).toBeVisible();
});

test("editing any approved deployment input requires a fresh specification approval", async ({
  page,
}) => {
  await page.goto("/contests/new");

  const edits = [
    { label: "Project title", value: "Build a safer Ledgerly launch page" },
    {
      label: "Project brief",
      value:
        "Build a responsive Ledgerly landing page with a hero, pricing, contact form, and an accessible navigation menu.",
    },
    { label: "Required headline", value: "Close the books before dinner." },
    { label: "Prize (test USDC)", value: "125" },
    { label: "Submission deadline", value: futureLocalDateTime(30) },
    { label: "Selection deadline", value: futureLocalDateTime(72) },
    { label: "Evaluator address", value: "0x0000000000000000000000000000000000000001" },
  ];

  for (const edit of edits) {
    await generateAndApprove(page);
    await page.getByLabel(edit.label).fill(edit.value);

    await expect(page.getByText("Approved for funding")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Structured requirements" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Deploy and fund on Arc" })).toHaveCount(0);
  }

  await generateAndApprove(page);
  await expect(page.getByText("Approved for funding")).toBeVisible();
});

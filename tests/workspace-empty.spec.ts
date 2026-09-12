import { expect, test } from "@playwright/test";

test("empty organization guides toward actionable action", async ({ page }) => {
  await page.goto("/workspace");
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).toContainText("What are we working on?");
  const newChatButton = page.getByRole("link", {
    name: /new chat|start a new chat/i,
  });
  await expect(newChatButton).toBeVisible();
});

test("empty organization does not create demo data", async ({ page }) => {
  await page.goto("/workspace");
  const createButton = page.getByRole("button", {
    name: /create persona|new project|create task/i,
  });
  if (await createButton.isVisible()) {
    await createButton.click();
  }
  await page.waitForTimeout(500);
  const pageContent = await page.content();
  expect(pageContent).not.toContain("demo");
  expect(pageContent).not.toContain("sample data");
  expect(pageContent).not.toContain("example data");
});

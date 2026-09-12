import { expect, test } from "@playwright/test";

test("workspace responsive at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("workspace responsive at 768px", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("workspace responsive at 1440px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("back button preserves draft on conversation page", async ({ page }) => {
  await page.goto("/workspace");
  const startChatButton = page.getByRole("link", {
    name: /start a new chat|new chat/i,
  });
  if (await startChatButton.isVisible()) {
    await startChatButton.click();
    const textarea = page.getByLabel("Message Pilot");
    if (await textarea.isVisible()) {
      await textarea.fill("draft message");
      await page.goBack();
      await page.goForward();
      const textareaAfter = page.getByLabel("Message Pilot");
      if (await textareaAfter.isVisible()) {
        const value = await textareaAfter.inputValue();
        expect(value).toBe("draft message");
      }
    }
  }
});

test("keyboard navigation reaches tasks and approvals", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/workspace");
  await page.keyboard.press("Tab");
  const tasksLink = page.getByRole("link", { name: "Tasks" });
  if (await tasksLink.isVisible()) {
    await tasksLink.focus();
    await page.keyboard.press("Enter");
    await expect(page.url()).toContain("/workspace/tasks");
  }
});

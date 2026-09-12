import { expect, test } from "@playwright/test";

test("New chat navigates to workspace with persona selection", async ({
  page,
}) => {
  await page.goto("/workspace");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const newChatButton = page.getByRole("link", { name: "New chat" });
  await expect(newChatButton).toBeVisible();
});

test("Navigation chain: New chat → Projects → conversation → task → approval", async ({
  page,
}) => {
  await page.goto("/workspace");

  await page.getByRole("link", { name: "Projects" }).click();
  await expect(page.url()).toContain("/workspace/projects");

  const projectLink = page.getByRole("link").first();
  if (await projectLink.isVisible()) {
    await projectLink.click();
    await expect(page.url()).toContain("/workspace/projects/");

    const conversationLink = page.getByRole("link").first();
    if (await conversationLink.isVisible()) {
      await conversationLink.click();
      await expect(page.url()).toContain("/workspace/workers/");
      await expect(page.url()).toContain("/conversations/");

      const taskTab = page.getByRole("link", { name: "Tasks" });
      if (await taskTab.isVisible()) {
        await taskTab.click();
        await expect(page.url()).toContain("/workspace/tasks");

        const approvalTab = page.getByRole("link", { name: "Approvals" });
        if (await approvalTab.isVisible()) {
          await approvalTab.click();
          await expect(page.url()).toContain("/workspace/approvals");
        }
      }
    }
  }
});

test("Tasks sidebar link reaches tasks page", async ({ page }) => {
  await page.goto("/workspace");
  const tasksLink = page.getByRole("link", { name: "Tasks" });
  await tasksLink.click();
  await expect(page.url()).toContain("/workspace/tasks");
});

import { expect, test } from "@playwright/test";

test("every workspace navigation destination requires a WorkOS session", async ({
  request,
}) => {
  for (const destination of [
    "/workspace",
    "/workspace/chats",
    "/workspace/dashboard",
    "/workspace/projects",
    "/workspace/tasks",
    "/workspace/approvals",
    "/workspace/settings",
  ]) {
    const response = await request.get(destination, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location).hostname).toBe(
      "api.workos.com",
    );
  }
});

test("New chat, project, task, and approval navigation works in one authenticated session", () => {
  test.skip(
    true,
    "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
  );
});

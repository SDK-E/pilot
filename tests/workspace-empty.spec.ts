import { expect, test } from "@playwright/test";

test("anonymous users are redirected before an empty workspace can render", async ({
  request,
}) => {
  const response = await request.get("/workspace", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(new URL(response.headers().location).hostname).toBe("api.workos.com");
});

test("public home does not prepopulate example organization data", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Give your team a place to think",
  );
  const content = await page.content();
  expect(content).not.toContain("sample data");
  expect(content).not.toContain("example data");
});

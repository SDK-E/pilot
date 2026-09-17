import { expect, test } from "@playwright/test";

import { redirectTarget } from "./helpers/redirect-target";

test("anonymous users are redirected before an empty workspace can render", async ({
  request,
}) => {
  const response = await request.get("/chat", { maxRedirects: 0 });

  expect(response.status()).toBe(307);
  expect(new URL(redirectTarget(response)).hostname).toBe("api.workos.com");
});

test("public home does not prepopulate example organization data", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Ask fast. Ship faster.",
  );
  const content = await page.content();
  expect(content).not.toContain("sample data");
  expect(content).not.toContain("example data");
});

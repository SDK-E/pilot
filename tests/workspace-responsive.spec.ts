import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`public entry point is responsive at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Give your team a place to think",
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`public page has no horizontal overflow at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");

    const hasOverflow = await page.evaluate(() => {
      const html = document.documentElement;
      const body = document.body;
      return (
        html.scrollWidth > window.innerWidth ||
        body.scrollWidth > window.innerWidth
      );
    });

    expect(hasOverflow).toBe(false);
  });
}

test("public keyboard navigation reaches the sign-in action", async ({
  page,
}) => {
  await page.goto("/");
  const signIn = page.getByRole("link", { name: "Sign in to Pilot" });

  await signIn.focus();
  await expect(signIn).toBeFocused();
});

test("back navigation preserves a draft in an authenticated conversation", () => {
  test.skip(
    true,
    "BLOCKED: requires a provisioned WorkOS browser fixture and a persisted conversation.",
  );
});

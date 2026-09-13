import { test } from "@playwright/test";

test.describe("Generation recovery", () => {
  test("active generation shows stop button", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    // Without a fixture that can trigger generation, this is a structural test.
  });

  test("stop button halts generation", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
  });

  test("timeout shows retry and cancel buttons", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
  });

  test("retry does not duplicate user message", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
  });

  test("cancel returns composer to idle state", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
  });

  test("navigation away during generation cleans up state", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
  });

  test("refresh preserves timeout recovery state", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
  });
});

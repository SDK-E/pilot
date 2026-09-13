import { expect, test } from "@playwright/test";

test.describe("Mobile drawer", () => {
  test("drawer is closed by default", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const sidebar = page.locator("[data-slot='sidebar'][data-mobile='true']");
    await expect(sidebar).toHaveAttribute("data-open", "false");
  });

  test("sidebar trigger opens the drawer", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const trigger = page.getByRole("button", { name: /Open navigation/ });
    await trigger.click();
    const sidebar = page.locator("[data-slot='sidebar'][data-mobile='true']");
    await expect(sidebar).toHaveAttribute("data-open", "true");
  });

  test("sidebar trigger has aria-expanded reflecting state", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const trigger = page.getByRole("button", { name: /Open navigation/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  test("focus moves into drawer when opened", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const trigger = page.getByRole("button", { name: /Open navigation/ });
    await trigger.click();
    const firstFocusable = page
      .locator("[data-slot='sidebar'][data-mobile='true']")
      .locator("a, button, input, [tabindex]:not([tabindex='-1'])")
      .first();
    await firstFocusable.focus();
    await expect(firstFocusable).toBeFocused();
  });

  test("Escape key closes the drawer", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const trigger = page.getByRole("button", { name: /Open navigation/ });
    await trigger.click();
    await page.keyboard.press("Escape");
    const sidebar = page.locator("[data-slot='sidebar'][data-mobile='true']");
    await expect(sidebar).toHaveAttribute("data-open", "false");
  });

  test("backdrop click closes the drawer", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const trigger = page.getByRole("button", { name: /Open navigation/ });
    await trigger.click();
    await page.keyboard.press("Escape");
    const sidebar = page.locator("[data-slot='sidebar'][data-mobile='true']");
    await expect(sidebar).toHaveAttribute("data-open", "false");
  });

  test("focus returns to trigger after drawer closes", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const trigger = page.getByRole("button", { name: /Open navigation/ });
    await trigger.click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
});

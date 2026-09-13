import { expect, test } from "@playwright/test";

test.describe("Starter cards", () => {
  test("Plan card is a link with the correct href", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const planCard = page.getByRole("link", { name: /Plan/ });
    await expect(planCard).toHaveAttribute("href", "/workspace?mode=plan");
  });

  test("Draft card is a link with the correct href", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const draftCard = page.getByRole("link", { name: /Draft/ });
    await expect(draftCard).toHaveAttribute("href", "/workspace?mode=draft");
  });

  test("Research card is disabled when research is unavailable", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const researchCard = page.getByRole("button", { name: /Research/ });
    await expect(researchCard).toBeDisabled();
    await expect(researchCard).toHaveAttribute("aria-disabled", "true");
  });

  test("Plan card activates on Enter and Space", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const planCard = page.getByRole("link", { name: /Plan/ });
    await planCard.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/mode=plan/);
  });

  test("Plan card activates on Space", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const planCard = page.getByRole("link", { name: /Plan/ });
    await planCard.focus();
    await page.keyboard.press(" ");
    await expect(page).toHaveURL(/mode=plan/);
  });

  test("Research card does not navigate when disabled", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const researchCard = page.getByRole("button", { name: /Research/ });
    await researchCard.click();
    await expect(page).toHaveURL("/workspace");
  });

  test("Research card shows correct tooltip for disabled state", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const researchCard = page.getByRole("button", { name: /Research/ });
    await expect(researchCard).toHaveAttribute(
      "title",
      "Research is not enabled for this environment yet.",
    );
  });

  test("URL query param pre-fills composer with mode template", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace?mode=plan");
    const textarea = page.getByLabel("Message Pilot");
    await expect(textarea).toHaveValue("Help me plan: ");
  });
});

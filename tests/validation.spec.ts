import { expect, test } from "@playwright/test";

test.describe("Validation", () => {
  test("empty submission shows validation error", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const sendButton = page.getByRole("button", { name: /Send message/ });
    await sendButton.click();
    await expect(page.getByRole("alert")).toContainText(
      "Message cannot be blank.",
    );
  });

  test("textarea receives focus after validation failure", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    const sendButton = page.getByRole("button", { name: /Send message/ });
    await sendButton.click();
    await expect(textarea).toBeFocused();
  });

  test("textarea has aria-invalid when validation fails", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    const sendButton = page.getByRole("button", { name: /Send message/ });
    await sendButton.click();
    await expect(textarea).toHaveAttribute("aria-invalid", "true");
  });

  test("textarea has aria-describedby pointing to error message", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const describedBy = await page
      .getByLabel("Message Pilot")
      .getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
  });

  test("error clears when user types after validation failure", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    const sendButton = page.getByRole("button", { name: /Send message/ });
    await sendButton.click();
    await expect(page.getByRole("alert")).toBeVisible();
    await textarea.fill("Hello");
    await expect(page.getByRole("alert")).not.toBeVisible();
  });

  test("10,000 character limit is enforced", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    await textarea.fill("A".repeat(10_001));
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(10_000);
  });

  test("form does not submit invalid input", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    await textarea.fill("   ");
    const sendButton = page.getByRole("button", { name: /Send message/ });
    await sendButton.click();
    await expect(page.getByRole("alert")).toContainText(
      "Message cannot be blank.",
    );
  });
});

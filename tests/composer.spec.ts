import { expect, test } from "@playwright/test";

test.describe("Composer", () => {
  test("fits within 375px viewport without horizontal overflow", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto("/workspace");

    const hasOverflow = await page.evaluate(() => {
      const html = document.documentElement;
      return html.scrollWidth > window.innerWidth;
    });

    expect(hasOverflow).toBe(false);
  });

  test("send and stop buttons are visible during generation", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.goto("/workspace");
    // Without a running runtime, we cannot trigger generation.
    // This test requires a fixture that can simulate generation.
  });

  test("textarea grows with content up to max-height and then scrolls", async ({
    page,
  }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    const longText = "Line 1\n".repeat(200);
    await textarea.fill(longText);
    const maxHeight = await textarea.evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(maxHeight).toBe(true);
  });

  test("composer has safe-area padding on mobile", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto("/workspace");
    const paddingBottom = await page.evaluate(() => {
      const composer = document.querySelector(".safe-bottom");
      if (!composer) return null;
      return window.getComputedStyle(composer).paddingBottom;
    });
    expect(paddingBottom).not.toBe("0px");
  });

  test("no horizontal overflow in composer at 375px", async ({ page }) => {
    test.skip(
      true,
      "BLOCKED: requires a provisioned WorkOS browser fixture with an active organization membership.",
    );
    await page.setViewportSize({ width: 375, height: 844 });
    await page.goto("/workspace");
    const textarea = page.getByLabel("Message Pilot");
    await textarea.fill("A".repeat(500));
    const hasOverflow = await page.evaluate(() => {
      const html = document.documentElement;
      return html.scrollWidth > window.innerWidth;
    });
    expect(hasOverflow).toBe(false);
  });

  test("keyboard focus is preserved after validation failure", async ({
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
    await expect(textarea).toBeFocused();
  });
});

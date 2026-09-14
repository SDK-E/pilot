import { expect, test } from "@playwright/test";

import { redirectTarget } from "./helpers/redirect-target";

test("every workspace navigation destination requires a WorkOS session", async ({
  request,
}) => {
  for (const destination of [
    "/chat",
    "/work",
    "/code",
    "/projects",
    "/agents",
    "/settings",
  ]) {
    const response = await request.get(destination, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(redirectTarget(response)).hostname).toBe("api.workos.com");
  }
});

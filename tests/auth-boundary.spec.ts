import { expect, test } from "@playwright/test";

test("public page renders with usable mobile navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Give your team a place to think",
  );
  await expect(
    page.getByRole("link", { name: "Sign in to Pilot" }),
  ).toHaveAttribute("href", "/sign-in");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("sign-in sets PKCE state and redirects to WorkOS", async ({ request }) => {
  const response = await request.get("/sign-in", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  const destination = new URL(response.headers().location);
  expect(destination.hostname).toBe("api.workos.com");
  expect(destination.searchParams.get("code_challenge_method")).toBe("S256");
  expect(destination.searchParams.get("state")).toBeTruthy();
  expect(response.headers()["set-cookie"]).toContain("HttpOnly");
});

test("anonymous and forged sessions cannot access workspace routes", async ({
  request,
}) => {
  for (const path of [
    "/workspace",
    "/workspace/workers/forged-worker",
    "/workspace/workers/forged-worker/conversations/00000000-0000-4000-8000-000000000000",
  ]) {
    for (const cookie of ["", "wos-session=forged-session"]) {
      const response = await request.get(path, {
        maxRedirects: 0,
        headers: { cookie },
      });
      expect(response.status()).toBe(307);
      expect(new URL(response.headers().location).hostname).toBe(
        "api.workos.com",
      );
    }
  }
});

test("callback without OAuth state cannot establish a session", async ({
  request,
}) => {
  const response = await request.get("/callback?code=invalid", {
    maxRedirects: 0,
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.headers()["set-cookie"] ?? "").not.toMatch(
    /wos-session=[^;]/,
  );
});

test("anonymous and forged sessions cannot access the conversation stream", async ({
  request,
}) => {
  for (const path of [
    "/api/conversations/stream",
    "/api/conversations/00000000-0000-4000-8000-000000000000/stream",
  ])
    for (const cookie of ["", "wos-session=forged-session"]) {
      const response = await request.post(path, {
        maxRedirects: 0,
        headers: {
          cookie,
          "content-type": "application/json",
        },
        data: {
          prompt: "Test",
          workerId: "00000000-0000-4000-8000-000000000000",
        },
      });
      expect(response.status()).toBe(303);
      expect(new URL(response.headers().location).hostname).toBe(
        "api.workos.com",
      );
    }
});

test("anonymous and forged sessions cannot read conversation activity", async ({
  request,
}) => {
  const path =
    "/api/conversations/00000000-0000-4000-8000-000000000000/activity";
  for (const cookie of ["", "wos-session=forged-session"]) {
    const response = await request.get(path, {
      maxRedirects: 0,
      headers: { cookie },
    });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);
    expect(new URL(response.headers().location).hostname).toBe(
      "api.workos.com",
    );
  }
});

test("anonymous and forged sessions cannot access private attachments", async ({
  request,
}) => {
  const conversationId = "00000000-0000-4000-8000-000000000000";
  const attachmentId = "00000000-0000-4000-8000-000000000000";
  for (const cookie of ["", "wos-session=forged-session"]) {
    for (const [method, path] of [
      ["post", `/api/conversations/${conversationId}/attachments`],
      ["get", `/api/attachments/${attachmentId}`],
      ["delete", `/api/attachments/${attachmentId}`],
    ] as const) {
      const response = await request[method](path, {
        maxRedirects: 0,
        headers: { cookie },
      });
      expect(response.status()).toBeGreaterThanOrEqual(300);
      expect(response.status()).toBeLessThan(400);
      expect(new URL(response.headers().location).hostname).toBe(
        "api.workos.com",
      );
    }
  }
});

test("anonymous and forged sessions cannot access private Project files", async ({
  request,
}) => {
  const projectId = "00000000-0000-4000-8000-000000000000";
  const fileId = "00000000-0000-4000-8000-000000000000";
  for (const cookie of ["", "wos-session=forged-session"]) {
    for (const [method, path] of [
      ["post", `/api/projects/${projectId}/files`],
      ["get", `/api/project-files/${fileId}`],
      ["delete", `/api/project-files/${fileId}`],
    ] as const) {
      const response = await request[method](path, {
        maxRedirects: 0,
        headers: { cookie },
      });
      expect(response.status()).toBeGreaterThanOrEqual(300);
      expect(response.status()).toBeLessThan(400);
      expect(new URL(response.headers().location).hostname).toBe(
        "api.workos.com",
      );
    }
  }
});

test("browser requests cannot use the private runtime scratchpad callback", async ({
  request,
}) => {
  for (const cookie of ["", "wos-session=forged-session"]) {
    const response = await request.post("/api/runtime/scratchpad", {
      headers: { cookie, "content-type": "application/json" },
      data: {
        organizationId: "org_forged",
        executionId: "00000000-0000-4000-8000-000000000000",
        action: "read",
      },
    });
    expect(response.status()).toBe(401);
  }
});

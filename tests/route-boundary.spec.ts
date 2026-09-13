import { expect, test } from "@playwright/test";

test("anonymous cannot access workspace routes (already in auth-boundary)", async ({
  request,
}) => {
  for (const path of ["/workspace", "/workspace/workers/forged-worker"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location).hostname).toBe(
      "api.workos.com",
    );
  }
});

test("anonymous cannot access runtime API routes", async ({ request }) => {
  for (const [method, path] of [
    ["post", "/api/runtime/activity"],
    ["post", "/api/runtime/scratchpad"],
  ] as const) {
    const response = await request[method](path, {
      maxRedirects: 0,
      headers: { "content-type": "application/json" },
      data:
        method === "post" && path.includes("activity")
          ? {
              organizationId: "org_forged",
              executionId: "00000000-0000-4000-8000-000000000000",
              toolId: "web-search",
              state: "started",
            }
          : {
              organizationId: "org_forged",
              executionId: "00000000-0000-4000-8000-000000000000",
              action: "read",
            },
    });
    expect(response.status()).toBe(401);
  }
});

test("foreign resource access produces no mutation", async ({ request }) => {
  const conversationId = "00000000-0000-4000-8000-000000000000";
  for (const cookie of ["", "wos-session=forged-session"]) {
    const response = await request.post(
      `/api/conversations/${conversationId}/stream`,
      {
        maxRedirects: 0,
        headers: { cookie, "content-type": "application/json" },
        data: {
          prompt: "Test",
          workerId: "00000000-0000-4000-8000-000000000000",
        },
      },
    );
    if (response.status() >= 300 && response.status() < 400) {
      expect(new URL(response.headers().location).hostname).toBe(
        "api.workos.com",
      );
    } else {
      expect(response.status()).toBeGreaterThanOrEqual(400);
    }
  }
});

test("forged session cannot read another user's conversation activity", async ({
  request,
}) => {
  const paths = [
    "/api/conversations/00000000-0000-4000-8000-000000000000/activity",
    "/api/conversations/00000000-0000-4000-8000-000000000000/messages?workerId=00000000-0000-4000-8000-000000000000",
  ];
  for (const path of paths) {
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
  }
});

test("anonymous POST to protected route produces no data creation", async ({
  request,
}) => {
  const response = await request.post(
    "/api/conversations/00000000-0000-4000-8000-000000000000/attachments",
    {
      maxRedirects: 0,
      headers: { "content-type": "application/json" },
      data: {
        pathname: "/test",
        filename: "test.txt",
        contentType: "text/plain",
        byteSize: 10,
      },
    },
  );
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(new URL(response.headers().location).hostname).toBe("api.workos.com");
});

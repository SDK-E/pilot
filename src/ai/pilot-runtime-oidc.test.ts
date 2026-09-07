import assert from "node:assert/strict";
import test from "node:test";

test("runtime activity callback requires a Vercel OIDC token", async () => {
  const { POST } = await import("@/app/api/runtime/activity/route");
  const response = await POST(
    new Request("https://pilot.test/api/runtime/activity", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationId: "org_forged",
        executionId: "8c7f3b32-7096-43a8-9e45-21f443cd7f3b",
        toolId: "web-search",
        state: "started",
      }),
    }),
  );

  assert.equal(response.status, 401);
});

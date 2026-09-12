import assert from "node:assert/strict";
import test from "node:test";
import { authorize } from "@/policy/authorize";
import type { ActorContext } from "@/policy/actor-context";

type RawMembership = {
  id: string;
  organizationId: string;
  workosUserId: string;
  workosMembershipId: string;
  email: string;
  roleSlug: string;
  createdAt: Date;
  updatedAt: Date;
};

async function mockContext(
  membership: RawMembership | undefined,
): Promise<ActorContext> {
  return {
    organizationId: "org_test",
    workosUserId: "user_a",
    membership: membership as unknown as ActorContext["membership"],
    roles: membership ? ["member"] : [],
    scope: membership
      ? [
          "conversation:read",
          "conversation:write",
          "project:read",
          "project:write",
          "execution:run",
          "approval:read",
        ]
      : [],
    policyVersion: "02",
  };
}

function mockMembership(active: boolean): RawMembership | undefined {
  return active
    ? {
        id: "mem_1",
        organizationId: "org_test",
        workosUserId: "user_a",
        workosMembershipId: "wos_1",
        email: "a@test.com",
        roleSlug: "member",
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : undefined;
}

test("AC-02-03: operations allowed with active membership", async () => {
  const ctx = await mockContext(await mockMembership(true));
  const result = authorize({
    actor: ctx,
    action: "read:conversation",
    resource: {
      type: "conversation",
      id: "conv_1",
      organizationId: "org_test",
      createdByWorkosUserId: "user_a",
    },
  });
  assert.equal(result.decision, "allow");
});

test("AC-02-03: operations denied after membership removal", async () => {
  const ctx = await mockContext(await mockMembership(false));
  const result = authorize({
    actor: ctx,
    action: "read:conversation",
    resource: {
      type: "conversation",
      id: "conv_1",
      organizationId: "org_test",
      createdByWorkosUserId: "user_a",
    },
  });
  assert.equal(result.decision, "deny");
  assert.equal(result.reasonCode, "no_active_membership");
});

test("AC-02-03: external tool access denied after membership removal", async () => {
  const ctx = await mockContext(await mockMembership(false));
  const result = authorize({
    actor: ctx,
    action: "execute:tool",
    resource: { type: "tool", id: "web-search", organizationId: "org_test" },
  });
  assert.equal(result.decision, "deny");
  assert.equal(result.reasonCode, "no_active_membership");
});

test("AC-02-03: foreign resource denied regardless of membership", async () => {
  const ctx = await mockContext(await mockMembership(true));
  const result = authorize({
    actor: ctx,
    action: "read:conversation",
    resource: {
      type: "conversation",
      id: "conv_foreign",
      organizationId: "org_other",
      createdByWorkosUserId: "user_b",
    },
  });
  assert.equal(result.decision, "deny");
  assert.equal(result.reasonCode, "foreign_resource");
});

test("AC-02-03: same org different user conversation is denied", async () => {
  const ctx = await mockContext(await mockMembership(true));
  const result = authorize({
    actor: ctx,
    action: "read:conversation",
    resource: {
      type: "conversation",
      id: "conv_b",
      organizationId: "org_test",
      createdByWorkosUserId: "user_b",
    },
  });
  assert.equal(result.decision, "deny");
  assert.equal(result.reasonCode, "not_resource_owner");
});

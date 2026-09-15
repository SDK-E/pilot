import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import test from "node:test";

import { eq } from "drizzle-orm";

import {
  disconnectConnectorConnection,
  setDefaultConnectorConnection,
  upsertConnectorConnection,
} from "@/connectors/connector-connection-mutations";
import {
  getAvailableConnectorProviders,
  listConnectorConnectionsForSettings,
  resolveDefaultConnectorConnection,
} from "@/connectors/connector-repository";
import { db } from "@/db/client";
import { connectorConnections, organizations } from "@/db/schema";

process.env.CONNECTOR_TOKEN_ENCRYPTION_KEY ??=
  randomBytes(32).toString("base64");

const suffix = randomUUID().replaceAll("-", "");
const organizationId = `org_connector_test_${suffix}`;
const userId = `user_${suffix}`;
const otherUserId = `other_user_${suffix}`;

test.before(async () => {
  await db
    .insert(organizations)
    .values({ id: organizationId, name: "Connector test organization" });
});

test.after(async () => {
  await db
    .delete(connectorConnections)
    .where(eq(connectorConnections.organizationId, organizationId));
  await db.delete(organizations).where(eq(organizations.id, organizationId));
});

async function connectPersonal(overrides: {
  userId: string;
  accountIdentifier: string;
}) {
  await upsertConnectorConnection({
    organizationId,
    ownerScope: "user",
    ownerWorkosUserId: overrides.userId,
    providerId: "github",
    accountIdentifier: overrides.accountIdentifier,
    accessToken: `token-for-${overrides.accountIdentifier}`,
    refreshToken: null,
    tokenExpiresAt: null,
    grantedScopes: ["repo"],
    createdByWorkosUserId: overrides.userId,
  });
}

test("re-authorizing the same account updates tokens in place rather than duplicating a row", async () => {
  await connectPersonal({ userId, accountIdentifier: "octocat" });
  await connectPersonal({ userId, accountIdentifier: "octocat" });

  const { personal } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  const githubConnections = personal.filter((c) => c.providerId === "github");
  assert.equal(githubConnections.length, 1);
  assert.equal(githubConnections[0]?.isDefault, true);
});

test("a second personal connection for the same provider is not auto-defaulted", async () => {
  await connectPersonal({ userId, accountIdentifier: "octocat-work" });

  const { personal } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  const githubConnections = personal.filter((c) => c.providerId === "github");
  assert.equal(githubConnections.length, 2);
  const defaults = githubConnections.filter((c) => c.isDefault);
  assert.equal(defaults.length, 1);
  assert.equal(defaults[0]?.accountIdentifier, "octocat");
});

test("setDefaultConnectorConnection swaps the default within the same owner+provider group", async () => {
  const { personal: before } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  const secondConnection = before.find(
    (c) => c.providerId === "github" && c.accountIdentifier === "octocat-work",
  );
  assert.ok(secondConnection);

  await setDefaultConnectorConnection({
    organizationId,
    userId,
    connectionId: secondConnection.id,
    isAdmin: false,
  });

  const { personal: after } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  const githubConnections = after.filter((c) => c.providerId === "github");
  assert.deepEqual(
    githubConnections
      .filter((c) => c.isDefault)
      .map((c) => c.accountIdentifier),
    ["octocat-work"],
  );
});

test("a personal default connection wins over an organization-wide one for the same provider", async () => {
  await upsertConnectorConnection({
    organizationId,
    ownerScope: "organization",
    ownerWorkosUserId: null,
    providerId: "slack",
    accountIdentifier: "shared-workspace",
    accessToken: "org-shared-token",
    refreshToken: null,
    tokenExpiresAt: null,
    grantedScopes: ["channels:read"],
    createdByWorkosUserId: userId,
  });

  const orgOnly = await resolveDefaultConnectorConnection({
    organizationId,
    userId: otherUserId,
    providerId: "slack",
  });
  assert.ok(orgOnly);
  assert.equal(orgOnly.ownerScope, "organization");
  assert.equal(orgOnly.accountIdentifier, "shared-workspace");

  await upsertConnectorConnection({
    organizationId,
    ownerScope: "user",
    ownerWorkosUserId: userId,
    providerId: "slack",
    accountIdentifier: "personal-workspace",
    accessToken: "personal-token",
    refreshToken: null,
    tokenExpiresAt: null,
    grantedScopes: ["channels:read"],
    createdByWorkosUserId: userId,
  });

  const withPersonal = await resolveDefaultConnectorConnection({
    organizationId,
    userId,
    providerId: "slack",
  });
  assert.ok(withPersonal);
  assert.equal(withPersonal.ownerScope, "user");
  assert.equal(withPersonal.accountIdentifier, "personal-workspace");

  const stillOrgForOtherUser = await resolveDefaultConnectorConnection({
    organizationId,
    userId: otherUserId,
    providerId: "slack",
  });
  assert.ok(stillOrgForOtherUser);
  assert.equal(stillOrgForOtherUser.ownerScope, "organization");
});

test("getAvailableConnectorProviders reflects org-wide and this user's own connections only", async () => {
  const forOwner = await getAvailableConnectorProviders({
    organizationId,
    userId,
  });
  assert.ok(forOwner.has("github"));
  assert.ok(forOwner.has("slack"));

  const forStranger = await getAvailableConnectorProviders({
    organizationId,
    userId: otherUserId,
  });
  assert.ok(!forStranger.has("github"));
  assert.ok(forStranger.has("slack"));
});

test("a member never sees another member's personal connections in Settings", async () => {
  const { personal } = await listConnectorConnectionsForSettings({
    organizationId,
    userId: otherUserId,
  });
  assert.equal(personal.filter((c) => c.providerId === "github").length, 0);
});

test("disconnectConnectorConnection refuses to revoke another member's personal connection", async () => {
  const { personal } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  const target = personal.find((c) => c.providerId === "github");
  assert.ok(target);

  await assert.rejects(
    disconnectConnectorConnection({
      organizationId,
      userId: otherUserId,
      connectionId: target.id,
      isAdmin: false,
    }),
    /belongs to another member/,
  );

  await disconnectConnectorConnection({
    organizationId,
    userId,
    connectionId: target.id,
    isAdmin: false,
  });
  const { personal: afterRevoke } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  assert.ok(afterRevoke.every((c) => c.id !== target.id));
});

test("disconnectConnectorConnection refuses to revoke an organization connection without admin", async () => {
  const { organization } = await listConnectorConnectionsForSettings({
    organizationId,
    userId,
  });
  const target = organization.find((c) => c.providerId === "slack");
  assert.ok(target);

  await assert.rejects(
    disconnectConnectorConnection({
      organizationId,
      userId,
      connectionId: target.id,
      isAdmin: false,
    }),
    /owners and admins/,
  );

  await disconnectConnectorConnection({
    organizationId,
    userId,
    connectionId: target.id,
    isAdmin: true,
  });
});

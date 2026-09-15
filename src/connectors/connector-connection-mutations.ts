import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import { encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorConnections } from "@/db/schema";

import type { ConnectorProviderId } from "@/connectors/connector-providers";

function ownerMatch(
  ownerScope: "organization" | "user",
  ownerWorkosUserId: string | null,
) {
  if (ownerScope === "user") {
    if (!ownerWorkosUserId) {
      throw new Error("A user-scoped connection requires an owner id.");
    }
    return eq(connectorConnections.ownerWorkosUserId, ownerWorkosUserId);
  }
  return isNull(connectorConnections.ownerWorkosUserId);
}

function connectionLabel(providerId: ConnectorProviderId, accountIdentifier: string) {
  const capitalized = `${providerId[0]?.toUpperCase()}${providerId.slice(1)}`;
  return `${capitalized} — ${accountIdentifier}`;
}

interface UpsertInput {
  organizationId: string;
  ownerScope: "organization" | "user";
  ownerWorkosUserId: string | null;
  providerId: ConnectorProviderId;
  label?: string;
  accountIdentifier: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
  createdByWorkosUserId: string;
}

async function findExistingConnectionId(input: UpsertInput): Promise<string | undefined> {
  const [existing] = await db
    .select({ id: connectorConnections.id })
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.organizationId, input.organizationId),
        eq(connectorConnections.ownerScope, input.ownerScope),
        ownerMatch(input.ownerScope, input.ownerWorkosUserId),
        eq(connectorConnections.providerId, input.providerId),
        eq(connectorConnections.accountIdentifier, input.accountIdentifier),
      ),
    )
    .limit(1);
  return existing?.id;
}

async function hasActiveDefault(input: UpsertInput): Promise<boolean> {
  const [existingDefault] = await db
    .select({ id: connectorConnections.id })
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.organizationId, input.organizationId),
        eq(connectorConnections.ownerScope, input.ownerScope),
        ownerMatch(input.ownerScope, input.ownerWorkosUserId),
        eq(connectorConnections.providerId, input.providerId),
        eq(connectorConnections.status, "active"),
        eq(connectorConnections.isDefault, true),
      ),
    )
    .limit(1);
  return Boolean(existingDefault);
}

/**
 * Inserts or refreshes a connection after a successful OAuth exchange (or a
 * token refresh). Matches on (organizationId, ownerScope, ownerWorkosUserId,
 * providerId, accountIdentifier); an existing row has its tokens/scope/
 * status updated in place, a new one is inserted with `isDefault: true` only
 * if it is the first active connection for that owner+provider.
 */
export async function upsertConnectorConnection(input: UpsertInput): Promise<void> {
  const accessToken = encryptToken(input.accessToken);
  const refreshToken = input.refreshToken ? encryptToken(input.refreshToken) : null;
  const label = input.label ?? connectionLabel(input.providerId, input.accountIdentifier);
  const tokenColumns = {
    encryptedAccessToken: accessToken.ciphertext,
    accessTokenIv: accessToken.iv,
    accessTokenAuthTag: accessToken.authTag,
    encryptedRefreshToken: refreshToken?.ciphertext ?? null,
    refreshTokenIv: refreshToken?.iv ?? null,
    refreshTokenAuthTag: refreshToken?.authTag ?? null,
  };

  const existingId = await findExistingConnectionId(input);
  if (existingId) {
    await db
      .update(connectorConnections)
      .set({
        label,
        ...tokenColumns,
        tokenExpiresAt: input.tokenExpiresAt,
        grantedScopes: input.grantedScopes,
        status: "active",
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(connectorConnections.id, existingId));
    return;
  }

  const hasDefault = await hasActiveDefault(input);
  await db.insert(connectorConnections).values({
    organizationId: input.organizationId,
    ownerScope: input.ownerScope,
    ownerWorkosUserId: input.ownerWorkosUserId,
    providerId: input.providerId,
    label,
    accountIdentifier: input.accountIdentifier,
    ...tokenColumns,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: input.grantedScopes,
    isDefault: !hasDefault,
    createdByWorkosUserId: input.createdByWorkosUserId,
  });
}

/**
 * Marks a connection unusable after a failed token refresh. Not exposed to
 * the settings UI — only the runtime execute route calls this.
 */
export async function markConnectorConnectionError(input: {
  connectionId: string;
  message: string;
}): Promise<void> {
  await db
    .update(connectorConnections)
    .set({
      status: "error",
      lastErrorMessage: input.message.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(connectorConnections.id, input.connectionId));
}

export async function touchConnectorConnectionLastUsed(
  connectionId: string,
): Promise<void> {
  await db
    .update(connectorConnections)
    .set({ lastUsedAt: new Date() })
    .where(eq(connectorConnections.id, connectionId));
}

function assertOwnedOrAdmin(
  connection: { ownerScope: "organization" | "user"; ownerWorkosUserId: string | null },
  input: { userId: string; isAdmin: boolean },
): void {
  if (connection.ownerScope === "organization" && !input.isAdmin) {
    throw new Error(
      "Only organization owners and admins can manage an organization connection.",
    );
  }
  if (
    connection.ownerScope === "user" &&
    connection.ownerWorkosUserId !== input.userId
  ) {
    throw new Error("This connection belongs to another member.");
  }
}

/**
 * Revokes a connection. `isAdmin` is checked here, not trusted from the
 * caller: an organization-scoped connection can only be revoked by an admin,
 * and a personal connection only by its own owner.
 */
export async function disconnectConnectorConnection(input: {
  organizationId: string;
  userId: string;
  connectionId: string;
  isAdmin: boolean;
}): Promise<void> {
  const [connection] = await db
    .select({
      ownerScope: connectorConnections.ownerScope,
      ownerWorkosUserId: connectorConnections.ownerWorkosUserId,
    })
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.id, input.connectionId),
        eq(connectorConnections.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!connection) return;
  assertOwnedOrAdmin(connection, input);

  await db
    .update(connectorConnections)
    .set({ status: "revoked", isDefault: false, updatedAt: new Date() })
    .where(eq(connectorConnections.id, input.connectionId));
}

/**
 * Makes one connection the default for its (organization, ownerScope,
 * owner, providerId) group, unsetting any other active default in that same
 * group first. Same ownership/admin check as `disconnectConnectorConnection`.
 */
export async function setDefaultConnectorConnection(input: {
  organizationId: string;
  userId: string;
  connectionId: string;
  isAdmin: boolean;
}): Promise<void> {
  const [connection] = await db
    .select({
      ownerScope: connectorConnections.ownerScope,
      ownerWorkosUserId: connectorConnections.ownerWorkosUserId,
      providerId: connectorConnections.providerId,
      status: connectorConnections.status,
    })
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.id, input.connectionId),
        eq(connectorConnections.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (connection?.status !== "active") return;
  assertOwnedOrAdmin(connection, input);

  await db.transaction(async (tx) => {
    await tx
      .update(connectorConnections)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(
        and(
          eq(connectorConnections.organizationId, input.organizationId),
          eq(connectorConnections.ownerScope, connection.ownerScope),
          ownerMatch(connection.ownerScope, connection.ownerWorkosUserId),
          eq(connectorConnections.providerId, connection.providerId),
          eq(connectorConnections.status, "active"),
        ),
      );
    await tx
      .update(connectorConnections)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(connectorConnections.id, input.connectionId));
  });
}

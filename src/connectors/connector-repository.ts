import "server-only";

import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";

import { db } from "@/db/client";
import { connectorConnections } from "@/db/schema";
import { decryptToken, encryptToken } from "@/connectors/token-encryption";

import type { ConnectorProviderId } from "@/connectors/connector-providers";

export interface ConnectionSummary {
  id: string;
  providerId: ConnectorProviderId;
  label: string;
  accountIdentifier: string;
  status: "active" | "revoked" | "error";
  isDefault: boolean;
  grantedScopes: string[];
  createdAt: Date;
  lastUsedAt: Date | null;
  createdByWorkosUserId: string;
}

export interface DecryptedConnection {
  id: string;
  providerId: ConnectorProviderId;
  ownerScope: "organization" | "user";
  accountIdentifier: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
}

const summaryColumns = {
  id: connectorConnections.id,
  ownerScope: connectorConnections.ownerScope,
  providerId: connectorConnections.providerId,
  label: connectorConnections.label,
  accountIdentifier: connectorConnections.accountIdentifier,
  status: connectorConnections.status,
  isDefault: connectorConnections.isDefault,
  grantedScopes: connectorConnections.grantedScopes,
  createdAt: connectorConnections.createdAt,
  lastUsedAt: connectorConnections.lastUsedAt,
  createdByWorkosUserId: connectorConnections.createdByWorkosUserId,
};

/**
 * The connector providers this user can currently use in a conversation:
 * either a shared organization connection, or their own personal one.
 */
export async function getAvailableConnectorProviders(input: {
  organizationId: string;
  userId: string;
}): Promise<Set<ConnectorProviderId>> {
  const rows = await db
    .selectDistinct({ providerId: connectorConnections.providerId })
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.organizationId, input.organizationId),
        eq(connectorConnections.status, "active"),
        or(
          eq(connectorConnections.ownerScope, "organization"),
          and(
            eq(connectorConnections.ownerScope, "user"),
            eq(connectorConnections.ownerWorkosUserId, input.userId),
          ),
        ),
      ),
    );
  return new Set(rows.map((row) => row.providerId));
}

/**
 * Connections visible in Settings: this user's own personal connections
 * (never another member's), plus every organization-shared connection.
 * Token/iv/authTag columns are never selected here.
 */
export async function listConnectorConnectionsForSettings(input: {
  organizationId: string;
  userId: string;
}): Promise<{
  personal: ConnectionSummary[];
  organization: ConnectionSummary[];
}> {
  const rows = await db
    .select(summaryColumns)
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.organizationId, input.organizationId),
        inArray(connectorConnections.status, ["active", "error"]),
        or(
          eq(connectorConnections.ownerScope, "organization"),
          and(
            eq(connectorConnections.ownerScope, "user"),
            eq(connectorConnections.ownerWorkosUserId, input.userId),
          ),
        ),
      ),
    )
    .orderBy(desc(connectorConnections.createdAt));

  const personal: ConnectionSummary[] = [];
  const organization: ConnectionSummary[] = [];
  for (const { ownerScope, ...summary } of rows) {
    (ownerScope === "user" ? personal : organization).push(summary);
  }
  return { personal, organization };
}

/**
 * The connection a runtime call should use for `providerId`: this user's own
 * personal default connection if they have one, otherwise the
 * organization's shared default. Decrypts tokens — this is the only
 * function in this module that does.
 */
export async function resolveDefaultConnectorConnection(input: {
  organizationId: string;
  userId: string;
  providerId: ConnectorProviderId;
}): Promise<DecryptedConnection | null> {
  const rows = await db
    .select({
      id: connectorConnections.id,
      ownerScope: connectorConnections.ownerScope,
      accountIdentifier: connectorConnections.accountIdentifier,
      encryptedAccessToken: connectorConnections.encryptedAccessToken,
      accessTokenIv: connectorConnections.accessTokenIv,
      accessTokenAuthTag: connectorConnections.accessTokenAuthTag,
      encryptedRefreshToken: connectorConnections.encryptedRefreshToken,
      refreshTokenIv: connectorConnections.refreshTokenIv,
      refreshTokenAuthTag: connectorConnections.refreshTokenAuthTag,
      tokenExpiresAt: connectorConnections.tokenExpiresAt,
      grantedScopes: connectorConnections.grantedScopes,
    })
    .from(connectorConnections)
    .where(
      and(
        eq(connectorConnections.organizationId, input.organizationId),
        eq(connectorConnections.providerId, input.providerId),
        eq(connectorConnections.status, "active"),
        eq(connectorConnections.isDefault, true),
        or(
          and(
            eq(connectorConnections.ownerScope, "user"),
            eq(connectorConnections.ownerWorkosUserId, input.userId),
          ),
          eq(connectorConnections.ownerScope, "organization"),
        ),
      ),
    );

  const personalRow = rows.find((row) => row.ownerScope === "user");
  const organizationRow = rows.find((row) => row.ownerScope === "organization");
  const row = personalRow ?? organizationRow;
  if (!row) return null;

  return {
    id: row.id,
    providerId: input.providerId,
    ownerScope: row.ownerScope,
    accountIdentifier: row.accountIdentifier,
    accessToken: decryptToken({
      ciphertext: row.encryptedAccessToken,
      iv: row.accessTokenIv,
      authTag: row.accessTokenAuthTag,
    }),
    refreshToken:
      row.encryptedRefreshToken && row.refreshTokenIv && row.refreshTokenAuthTag
        ? decryptToken({
            ciphertext: row.encryptedRefreshToken,
            iv: row.refreshTokenIv,
            authTag: row.refreshTokenAuthTag,
          })
        : null,
    tokenExpiresAt: row.tokenExpiresAt,
    grantedScopes: row.grantedScopes,
  };
}

function ownerMatch(ownerScope: "organization" | "user", ownerWorkosUserId: string | null) {
  return ownerScope === "user"
    ? eq(connectorConnections.ownerWorkosUserId, ownerWorkosUserId as string)
    : isNull(connectorConnections.ownerWorkosUserId);
}

/**
 * Inserts or refreshes a connection after a successful OAuth exchange (or a
 * token refresh). Matches on (organizationId, ownerScope, ownerWorkosUserId,
 * providerId, accountIdentifier); an existing row has its tokens/scope/
 * status updated in place, a new one is inserted with `isDefault: true` only
 * if it is the first active connection for that owner+provider.
 */
export async function upsertConnectorConnection(input: {
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
}): Promise<void> {
  const accessToken = encryptToken(input.accessToken);
  const refreshToken = input.refreshToken ? encryptToken(input.refreshToken) : null;
  const label =
    input.label ??
    `${input.providerId[0]?.toUpperCase()}${input.providerId.slice(1)} — ${input.accountIdentifier}`;

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

  if (existing) {
    await db
      .update(connectorConnections)
      .set({
        label,
        encryptedAccessToken: accessToken.ciphertext,
        accessTokenIv: accessToken.iv,
        accessTokenAuthTag: accessToken.authTag,
        encryptedRefreshToken: refreshToken?.ciphertext ?? null,
        refreshTokenIv: refreshToken?.iv ?? null,
        refreshTokenAuthTag: refreshToken?.authTag ?? null,
        tokenExpiresAt: input.tokenExpiresAt,
        grantedScopes: input.grantedScopes,
        status: "active",
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(connectorConnections.id, existing.id));
    return;
  }

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

  await db.insert(connectorConnections).values({
    organizationId: input.organizationId,
    ownerScope: input.ownerScope,
    ownerWorkosUserId: input.ownerWorkosUserId,
    providerId: input.providerId,
    label,
    accountIdentifier: input.accountIdentifier,
    encryptedAccessToken: accessToken.ciphertext,
    accessTokenIv: accessToken.iv,
    accessTokenAuthTag: accessToken.authTag,
    encryptedRefreshToken: refreshToken?.ciphertext ?? null,
    refreshTokenIv: refreshToken?.iv ?? null,
    refreshTokenAuthTag: refreshToken?.authTag ?? null,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: input.grantedScopes,
    isDefault: !existingDefault,
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
  if (!connection || connection.status !== "active") return;
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

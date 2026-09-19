import "server-only";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { decryptToken, encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorConnections, connectorDefinitions } from "@/db/schema";

import type { DecryptedConnectorDefinition } from "@/connectors/connector-definition-types";

/**
 * A definition's OAuth config, decrypted, for starting/continuing its OAuth
 * flow. Never returns another organization's definition.
 */
export async function getDecryptedConnectorDefinition(input: {
  organizationId: string;
  id: string;
}): Promise<DecryptedConnectorDefinition | null> {
  const [row] = await db
    .select({
      id: connectorDefinitions.id,
      organizationId: connectorDefinitions.organizationId,
      slug: connectorDefinitions.slug,
      displayName: connectorDefinitions.displayName,
      authorizeUrl: connectorDefinitions.authorizeUrl,
      tokenUrl: connectorDefinitions.tokenUrl,
      scopes: connectorDefinitions.scopes,
      scopeDelimiter: connectorDefinitions.scopeDelimiter,
      clientId: connectorDefinitions.clientId,
      encryptedClientSecret: connectorDefinitions.encryptedClientSecret,
      clientSecretIv: connectorDefinitions.clientSecretIv,
      clientSecretAuthTag: connectorDefinitions.clientSecretAuthTag,
      accountIdentifierUrl: connectorDefinitions.accountIdentifierUrl,
      accountIdentifierField: connectorDefinitions.accountIdentifierField,
      actions: connectorDefinitions.actions,
      allowPersonalConnections: connectorDefinitions.allowPersonalConnections,
    })
    .from(connectorDefinitions)
    .where(
      and(
        eq(connectorDefinitions.id, input.id),
        eq(connectorDefinitions.organizationId, input.organizationId),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    slug: row.slug,
    displayName: row.displayName,
    authorizeUrl: row.authorizeUrl,
    tokenUrl: row.tokenUrl,
    scopes: row.scopes,
    scopeDelimiter: row.scopeDelimiter,
    clientId: row.clientId,
    clientSecret: decryptToken({
      ciphertext: row.encryptedClientSecret,
      iv: row.clientSecretIv,
      authTag: row.clientSecretAuthTag,
    }),
    accountIdentifierUrl: row.accountIdentifierUrl,
    accountIdentifierField: row.accountIdentifierField,
    actions: row.actions,
    allowPersonalConnections: row.allowPersonalConnections,
  };
}

export type ConnectionScope = "organization" | "personal";

/**
 * A connection row is uniquely addressed by `(connectorDefinitionId, scope,
 * ownerWorkosUserId)` — `ownerWorkosUserId` only matters (and must be set)
 * for `"personal"`; an `"organization"` row is looked up with it always
 * null, matching the partial unique index.
 */
export function scopeCondition(
  connectorDefinitionId: string,
  scope: ConnectionScope,
  ownerWorkosUserId: string | null,
) {
  return and(
    eq(connectorConnections.connectorDefinitionId, connectorDefinitionId),
    eq(connectorConnections.scope, scope),
    ownerWorkosUserId
      ? eq(connectorConnections.ownerWorkosUserId, ownerWorkosUserId)
      : isNull(connectorConnections.ownerWorkosUserId),
  );
}

export async function saveConnectorConnection(input: {
  organizationId: string;
  connectorDefinitionId: string;
  scope: ConnectionScope;
  ownerWorkosUserId: string | null;
  accountIdentifier: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
}): Promise<void> {
  const access = encryptToken(input.accessToken);
  const refresh = input.refreshToken ? encryptToken(input.refreshToken) : null;
  const values = {
    connectorDefinitionId: input.connectorDefinitionId,
    organizationId: input.organizationId,
    scope: input.scope,
    ownerWorkosUserId: input.ownerWorkosUserId,
    accountIdentifier: input.accountIdentifier,
    encryptedAccessToken: access.ciphertext,
    accessTokenIv: access.iv,
    accessTokenAuthTag: access.authTag,
    encryptedRefreshToken: refresh?.ciphertext ?? null,
    refreshTokenIv: refresh?.iv ?? null,
    refreshTokenAuthTag: refresh?.authTag ?? null,
    tokenExpiresAt: input.tokenExpiresAt,
    grantedScopes: input.grantedScopes,
    connectionStatus: "active" as const,
    lastErrorMessage: null,
    updatedAt: new Date(),
  };
  const [existing] = await db
    .select({ id: connectorConnections.id })
    .from(connectorConnections)
    .where(
      scopeCondition(
        input.connectorDefinitionId,
        input.scope,
        input.ownerWorkosUserId,
      ),
    )
    .limit(1);
  if (existing) {
    await db
      .update(connectorConnections)
      .set(values)
      .where(eq(connectorConnections.id, existing.id));
  } else {
    await db.insert(connectorConnections).values(values);
  }
}

export async function disconnectConnectorConnection(input: {
  organizationId: string;
  connectorDefinitionId: string;
  scope: ConnectionScope;
  ownerWorkosUserId: string | null;
}): Promise<void> {
  await db
    .delete(connectorConnections)
    .where(
      and(
        eq(connectorConnections.organizationId, input.organizationId),
        scopeCondition(
          input.connectorDefinitionId,
          input.scope,
          input.ownerWorkosUserId,
        ),
      ),
    );
}

export async function markConnectorConnectionError(input: {
  connectionId: string;
  message: string;
}): Promise<void> {
  await db
    .update(connectorConnections)
    .set({
      connectionStatus: "error",
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

export interface ConnectionSummary {
  id: string;
  scope: ConnectionScope;
  ownerWorkosUserId: string | null;
  connectionStatus: "not_connected" | "active" | "error";
  accountIdentifier: string | null;
  lastErrorMessage: string | null;
  lastUsedAt: Date | null;
}

/**
 * Every connection row (org-wide plus every personal one) for the
 * definitions given, for rendering Settings. Never decrypts tokens.
 */
export async function listConnectionSummaries(
  connectorDefinitionIds: string[],
): Promise<Map<string, ConnectionSummary[]>> {
  if (connectorDefinitionIds.length === 0) return new Map();
  const rows = await db
    .select({
      connectorDefinitionId: connectorConnections.connectorDefinitionId,
      id: connectorConnections.id,
      scope: connectorConnections.scope,
      ownerWorkosUserId: connectorConnections.ownerWorkosUserId,
      connectionStatus: connectorConnections.connectionStatus,
      accountIdentifier: connectorConnections.accountIdentifier,
      lastErrorMessage: connectorConnections.lastErrorMessage,
      lastUsedAt: connectorConnections.lastUsedAt,
    })
    .from(connectorConnections)
    .where(
      inArray(
        connectorConnections.connectorDefinitionId,
        connectorDefinitionIds,
      ),
    );
  const byDefinition = new Map<string, ConnectionSummary[]>();
  for (const row of rows) {
    const list = byDefinition.get(row.connectorDefinitionId) ?? [];
    list.push({
      id: row.id,
      scope: row.scope,
      ownerWorkosUserId: row.ownerWorkosUserId,
      connectionStatus: row.connectionStatus,
      accountIdentifier: row.accountIdentifier,
      lastErrorMessage: row.lastErrorMessage,
      lastUsedAt: row.lastUsedAt,
    });
    byDefinition.set(row.connectorDefinitionId, list);
  }
  return byDefinition;
}

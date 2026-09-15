import "server-only";

import { and, desc, eq, inArray, or } from "drizzle-orm";

import { decryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorConnections } from "@/db/schema";

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

function decryptConnectionTokens(row: {
  encryptedAccessToken: string;
  accessTokenIv: string;
  accessTokenAuthTag: string;
  encryptedRefreshToken: string | null;
  refreshTokenIv: string | null;
  refreshTokenAuthTag: string | null;
}): { accessToken: string; refreshToken: string | null } {
  const accessToken = decryptToken({
    ciphertext: row.encryptedAccessToken,
    iv: row.accessTokenIv,
    authTag: row.accessTokenAuthTag,
  });
  const refreshToken =
    row.encryptedRefreshToken && row.refreshTokenIv && row.refreshTokenAuthTag
      ? decryptToken({
          ciphertext: row.encryptedRefreshToken,
          iv: row.refreshTokenIv,
          authTag: row.refreshTokenAuthTag,
        })
      : null;
  return { accessToken, refreshToken };
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
    ...decryptConnectionTokens(row),
    tokenExpiresAt: row.tokenExpiresAt,
    grantedScopes: row.grantedScopes,
  };
}

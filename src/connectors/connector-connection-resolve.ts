import "server-only";

import { and, eq } from "drizzle-orm";

import { scopeCondition } from "@/connectors/connector-connection-repository";
import { decryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorConnections, connectorDefinitions } from "@/db/schema";

import type {
  DecryptedConnectorDefinition,
  DecryptedConnectorDefinitionConnection,
} from "@/connectors/connector-definition-types";

const connectionRowColumns = {
  id: connectorConnections.id,
  connectorDefinitionId: connectorConnections.connectorDefinitionId,
  scope: connectorConnections.scope,
  ownerWorkosUserId: connectorConnections.ownerWorkosUserId,
  connectionStatus: connectorConnections.connectionStatus,
  accountIdentifier: connectorConnections.accountIdentifier,
  lastErrorMessage: connectorConnections.lastErrorMessage,
  lastUsedAt: connectorConnections.lastUsedAt,
  encryptedAccessToken: connectorConnections.encryptedAccessToken,
  accessTokenIv: connectorConnections.accessTokenIv,
  accessTokenAuthTag: connectorConnections.accessTokenAuthTag,
  encryptedRefreshToken: connectorConnections.encryptedRefreshToken,
  refreshTokenIv: connectorConnections.refreshTokenIv,
  refreshTokenAuthTag: connectorConnections.refreshTokenAuthTag,
  tokenExpiresAt: connectorConnections.tokenExpiresAt,
  grantedScopes: connectorConnections.grantedScopes,
};

function toDecryptedDefinitionConnection(
  definition: DecryptedConnectorDefinition,
  row: {
    id: string;
    scope: "organization" | "personal";
    ownerWorkosUserId: string | null;
    accountIdentifier: string | null;
    encryptedAccessToken: string;
    accessTokenIv: string;
    accessTokenAuthTag: string;
    encryptedRefreshToken: string | null;
    refreshTokenIv: string | null;
    refreshTokenAuthTag: string | null;
    tokenExpiresAt: Date | null;
    grantedScopes: string[];
  },
): DecryptedConnectorDefinition & DecryptedConnectorDefinitionConnection {
  return {
    ...definition,
    connectionId: row.id,
    connectorDefinitionId: definition.id,
    scope: row.scope,
    ownerWorkosUserId: row.ownerWorkosUserId,
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

async function loadActiveDefinition(
  organizationId: string,
  slug: string,
): Promise<
  (DecryptedConnectorDefinition & { allowPersonalConnections: boolean }) | null
> {
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
      definitionStatus: connectorDefinitions.definitionStatus,
      allowPersonalConnections: connectorDefinitions.allowPersonalConnections,
    })
    .from(connectorDefinitions)
    .where(
      and(
        eq(connectorDefinitions.organizationId, organizationId),
        eq(connectorDefinitions.slug, slug),
      ),
    )
    .limit(1);
  if (row?.definitionStatus !== "active") return null;
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

/**
 * Resolves one active, connected connector by slug for use in a tool call —
 * a personal connection owned by `actingUserId` first (when the definition
 * allows personal connections), falling back to the shared org-wide
 * connection. Decrypts tokens — the only place that does, other than
 * `getDecryptedConnectorDefinition` (OAuth config, not the connection).
 */
export async function resolveConnectorConnection(input: {
  organizationId: string;
  slug: string;
  actingUserId: string;
}): Promise<
  (DecryptedConnectorDefinition & DecryptedConnectorDefinitionConnection) | null
> {
  const definition = await loadActiveDefinition(
    input.organizationId,
    input.slug,
  );
  if (!definition) return null;

  const candidates = definition.allowPersonalConnections
    ? [
        scopeCondition(definition.id, "personal", input.actingUserId),
        scopeCondition(definition.id, "organization", null),
      ]
    : [scopeCondition(definition.id, "organization", null)];

  for (const condition of candidates) {
    const [row] = await db
      .select(connectionRowColumns)
      .from(connectorConnections)
      .where(condition)
      .limit(1);
    if (
      row?.connectionStatus === "active" &&
      row.encryptedAccessToken &&
      row.accessTokenIv &&
      row.accessTokenAuthTag
    ) {
      return toDecryptedDefinitionConnection(definition, {
        ...row,
        encryptedAccessToken: row.encryptedAccessToken,
        accessTokenIv: row.accessTokenIv,
        accessTokenAuthTag: row.accessTokenAuthTag,
      });
    }
  }
  return null;
}

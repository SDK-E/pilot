import "server-only";

import { and, eq } from "drizzle-orm";

import { decryptToken, encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorDefinitions } from "@/db/schema";

import type {
  DecryptedConnectorDefinition,
  DecryptedConnectorDefinitionConnection,
} from "@/connectors/connector-definition-types";

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
  };
}

export async function saveConnectorDefinitionConnection(input: {
  organizationId: string;
  id: string;
  accountIdentifier: string;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
}): Promise<void> {
  const access = encryptToken(input.accessToken);
  const refresh = input.refreshToken ? encryptToken(input.refreshToken) : null;
  await db
    .update(connectorDefinitions)
    .set({
      accountIdentifier: input.accountIdentifier,
      encryptedAccessToken: access.ciphertext,
      accessTokenIv: access.iv,
      accessTokenAuthTag: access.authTag,
      encryptedRefreshToken: refresh?.ciphertext ?? null,
      refreshTokenIv: refresh?.iv ?? null,
      refreshTokenAuthTag: refresh?.authTag ?? null,
      tokenExpiresAt: input.tokenExpiresAt,
      grantedScopes: input.grantedScopes,
      connectionStatus: "active",
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(connectorDefinitions.id, input.id),
        eq(connectorDefinitions.organizationId, input.organizationId),
      ),
    );
}

export async function disconnectConnectorDefinition(input: {
  organizationId: string;
  id: string;
}): Promise<void> {
  await db
    .update(connectorDefinitions)
    .set({
      connectionStatus: "not_connected",
      accountIdentifier: null,
      encryptedAccessToken: null,
      accessTokenIv: null,
      accessTokenAuthTag: null,
      encryptedRefreshToken: null,
      refreshTokenIv: null,
      refreshTokenAuthTag: null,
      tokenExpiresAt: null,
      grantedScopes: [],
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(connectorDefinitions.id, input.id),
        eq(connectorDefinitions.organizationId, input.organizationId),
      ),
    );
}

export async function markConnectorDefinitionError(input: {
  id: string;
  message: string;
}): Promise<void> {
  await db
    .update(connectorDefinitions)
    .set({
      connectionStatus: "error",
      lastErrorMessage: input.message.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(connectorDefinitions.id, input.id));
}

export async function touchConnectorDefinitionLastUsed(
  id: string,
): Promise<void> {
  await db
    .update(connectorDefinitions)
    .set({ lastUsedAt: new Date() })
    .where(eq(connectorDefinitions.id, id));
}

const connectionRowColumns = {
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
  connectionStatus: connectorDefinitions.connectionStatus,
  accountIdentifier: connectorDefinitions.accountIdentifier,
  encryptedAccessToken: connectorDefinitions.encryptedAccessToken,
  accessTokenIv: connectorDefinitions.accessTokenIv,
  accessTokenAuthTag: connectorDefinitions.accessTokenAuthTag,
  encryptedRefreshToken: connectorDefinitions.encryptedRefreshToken,
  refreshTokenIv: connectorDefinitions.refreshTokenIv,
  refreshTokenAuthTag: connectorDefinitions.refreshTokenAuthTag,
  tokenExpiresAt: connectorDefinitions.tokenExpiresAt,
  grantedScopes: connectorDefinitions.grantedScopes,
};

type ConnectionRow =
  typeof connectionRowColumns extends Record<string, infer _V>
    ? Awaited<ReturnType<typeof selectConnectionRow>>[number]
    : never;

async function selectConnectionRow(organizationId: string, slug: string) {
  return db
    .select(connectionRowColumns)
    .from(connectorDefinitions)
    .where(
      and(
        eq(connectorDefinitions.organizationId, organizationId),
        eq(connectorDefinitions.slug, slug),
      ),
    )
    .limit(1);
}

function toDecryptedDefinitionConnection(
  row: ConnectionRow & {
    encryptedAccessToken: string;
    accessTokenIv: string;
    accessTokenAuthTag: string;
  },
): DecryptedConnectorDefinition & DecryptedConnectorDefinitionConnection {
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
    connectorDefinitionId: row.id,
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

/**
 * Resolves one active, connected custom connector by slug for use in a tool
 * call. Decrypts tokens — the only function in this module that does, other
 * than `getDecryptedConnectorDefinition` (OAuth config, not the connection).
 */
export async function resolveConnectorDefinitionConnection(input: {
  organizationId: string;
  slug: string;
}): Promise<
  (DecryptedConnectorDefinition & DecryptedConnectorDefinitionConnection) | null
> {
  const [row] = await selectConnectionRow(input.organizationId, input.slug);
  if (row?.definitionStatus !== "active" || row.connectionStatus !== "active") {
    return null;
  }
  const { encryptedAccessToken, accessTokenIv, accessTokenAuthTag } = row;
  if (!encryptedAccessToken || !accessTokenIv || !accessTokenAuthTag)
    return null;
  return toDecryptedDefinitionConnection({
    ...row,
    encryptedAccessToken,
    accessTokenIv,
    accessTokenAuthTag,
  });
}

import "server-only";

import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";

import { decryptToken, encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorProviders } from "@/db/schema";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

export interface ConnectorProviderSummary {
  id: string;
  slug: string;
  displayName: string;
  icon: string | null;
  description: string;
  clientId: string;
  enabled: boolean;
  updatedAt: Date;
}

/**
 * The non-secret config the admin UI needs to render and prefill an edit
 * dialog for one provider.
 */
export interface ConnectorProviderForAdmin extends ConnectorProviderSummary {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDelimiter: string;
  accountIdentifierUrl: string | null;
  accountIdentifierField: string | null;
  actions: ConnectorDefinitionAction[];
}

/**
 * Full config including the decrypted client secret — server-only, never
 * sent to a client. This is what `connector-seed.ts` consumes directly to
 * populate an organization's `connector_definitions`.
 */
export interface DecryptedConnectorProvider {
  id: string;
  slug: string;
  displayName: string;
  icon: string | null;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDelimiter: string;
  clientId: string;
  clientSecret: string;
  accountIdentifierUrl: string | null;
  accountIdentifierField: string | null;
  actions: ConnectorDefinitionAction[];
}

export interface ConnectorProviderConfig {
  slug: string;
  displayName: string;
  icon: string | null;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDelimiter: string;
  clientId: string;
  clientSecret: string;
  accountIdentifierUrl: string | null;
  accountIdentifierField: string | null;
  actions: ConnectorDefinitionAction[];
  updatedByWorkosUserId: string;
}

const summaryColumns = {
  id: connectorProviders.id,
  slug: connectorProviders.slug,
  displayName: connectorProviders.displayName,
  icon: connectorProviders.icon,
  description: connectorProviders.description,
  clientId: connectorProviders.clientId,
  enabled: connectorProviders.enabled,
  updatedAt: connectorProviders.updatedAt,
};

/**
 * Never selects the encrypted secret columns — for the admin list view.
 */
export async function listConnectorProviders(): Promise<
  ConnectorProviderSummary[]
> {
  return db
    .select(summaryColumns)
    .from(connectorProviders)
    .orderBy(connectorProviders.createdAt);
}

/**
 * Full non-secret fields for populating the edit dialog.
 */
export async function getConnectorProvider(
  id: string,
): Promise<ConnectorProviderForAdmin | null> {
  const [row] = await db
    .select({
      ...summaryColumns,
      authorizeUrl: connectorProviders.authorizeUrl,
      tokenUrl: connectorProviders.tokenUrl,
      scopes: connectorProviders.scopes,
      scopeDelimiter: connectorProviders.scopeDelimiter,
      accountIdentifierUrl: connectorProviders.accountIdentifierUrl,
      accountIdentifierField: connectorProviders.accountIdentifierField,
      actions: connectorProviders.actions,
    })
    .from(connectorProviders)
    .where(eq(connectorProviders.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * Full config including the decrypted client secret, for every enabled
 * provider — what seeding an organization's connectors actually reads.
 */
export async function listEnabledConnectorProviders(): Promise<
  DecryptedConnectorProvider[]
> {
  const rows = await db
    .select()
    .from(connectorProviders)
    .where(eq(connectorProviders.enabled, true));
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    icon: row.icon,
    description: row.description,
    authorizeUrl: row.authorizeUrl,
    tokenUrl: row.tokenUrl,
    scopes: row.scopes,
    scopeDelimiter: row.scopeDelimiter,
    clientId: row.clientId,
    clientSecret: decryptToken({
      ciphertext: row.clientSecretCiphertext,
      iv: row.clientSecretIv,
      authTag: row.clientSecretAuthTag,
    }),
    accountIdentifierUrl: row.accountIdentifierUrl,
    accountIdentifierField: row.accountIdentifierField,
    actions: row.actions,
  }));
}

export async function createConnectorProvider(
  input: ConnectorProviderConfig,
): Promise<string> {
  const secret = encryptToken(input.clientSecret);
  const id = randomUUID();
  await db.insert(connectorProviders).values({
    id,
    slug: input.slug,
    displayName: input.displayName,
    icon: input.icon,
    description: input.description,
    authorizeUrl: input.authorizeUrl,
    tokenUrl: input.tokenUrl,
    scopes: input.scopes,
    scopeDelimiter: input.scopeDelimiter,
    clientId: input.clientId,
    clientSecretCiphertext: secret.ciphertext,
    clientSecretIv: secret.iv,
    clientSecretAuthTag: secret.authTag,
    accountIdentifierUrl: input.accountIdentifierUrl,
    accountIdentifierField: input.accountIdentifierField,
    actions: input.actions,
    updatedByWorkosUserId: input.updatedByWorkosUserId,
  });
  return id;
}

/**
 * Updates a provider's configuration. `clientSecret` is left unchanged
 * when omitted (an admin editing a provider doesn't need to re-paste a
 * secret they can no longer see). The slug is immutable once created.
 */
export async function updateConnectorProvider(input: {
  id: string;
  displayName: string;
  icon: string | null;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDelimiter: string;
  clientId: string;
  clientSecret: string | null;
  accountIdentifierUrl: string | null;
  accountIdentifierField: string | null;
  actions: ConnectorDefinitionAction[];
  updatedByWorkosUserId: string;
}): Promise<void> {
  const secret = input.clientSecret ? encryptToken(input.clientSecret) : null;
  await db
    .update(connectorProviders)
    .set({
      displayName: input.displayName,
      icon: input.icon,
      description: input.description,
      authorizeUrl: input.authorizeUrl,
      tokenUrl: input.tokenUrl,
      scopes: input.scopes,
      scopeDelimiter: input.scopeDelimiter,
      clientId: input.clientId,
      ...(secret && {
        clientSecretCiphertext: secret.ciphertext,
        clientSecretIv: secret.iv,
        clientSecretAuthTag: secret.authTag,
      }),
      accountIdentifierUrl: input.accountIdentifierUrl,
      accountIdentifierField: input.accountIdentifierField,
      actions: input.actions,
      updatedByWorkosUserId: input.updatedByWorkosUserId,
      updatedAt: new Date(),
    })
    .where(eq(connectorProviders.id, input.id));
}

export async function setConnectorProviderEnabled(
  id: string,
  isEnabled: boolean,
): Promise<void> {
  await db
    .update(connectorProviders)
    .set({ enabled: isEnabled, updatedAt: new Date() })
    .where(eq(connectorProviders.id, id));
}

export async function deleteConnectorProvider(id: string): Promise<void> {
  await db.delete(connectorProviders).where(eq(connectorProviders.id, id));
}

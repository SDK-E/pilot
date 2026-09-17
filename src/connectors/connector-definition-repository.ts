import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  connectorDefinitionSummaryColumns,
  type ConnectorDefinitionConfig,
  type ConnectorDefinitionForSettings,
  type ConnectorDefinitionSummary,
} from "@/connectors/connector-definition-types";
import { encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorDefinitions } from "@/db/schema";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

export type {
  ConnectorDefinitionConfig,
  ConnectorDefinitionForSettings,
  ConnectorDefinitionSummary,
} from "@/connectors/connector-definition-types";
export {
  disconnectConnectorDefinition,
  getDecryptedConnectorDefinition,
  markConnectorDefinitionError,
  resolveConnectorDefinitionConnection,
  saveConnectorDefinitionConnection,
  touchConnectorDefinitionLastUsed,
} from "@/connectors/connector-definition-connection-repository";

export async function listConnectorDefinitions(
  organizationId: string,
): Promise<ConnectorDefinitionSummary[]> {
  return db
    .select(connectorDefinitionSummaryColumns)
    .from(connectorDefinitions)
    .where(eq(connectorDefinitions.organizationId, organizationId))
    .orderBy(connectorDefinitions.createdAt);
}

/**
 * Never selects secret columns (encrypted tokens/client secret).
 */
export async function listConnectorDefinitionsForSettings(
  organizationId: string,
): Promise<ConnectorDefinitionForSettings[]> {
  return db
    .select({
      ...connectorDefinitionSummaryColumns,
      authorizeUrl: connectorDefinitions.authorizeUrl,
      tokenUrl: connectorDefinitions.tokenUrl,
      clientId: connectorDefinitions.clientId,
      scopes: connectorDefinitions.scopes,
      accountIdentifierUrl: connectorDefinitions.accountIdentifierUrl,
      accountIdentifierField: connectorDefinitions.accountIdentifierField,
    })
    .from(connectorDefinitions)
    .where(eq(connectorDefinitions.organizationId, organizationId))
    .orderBy(connectorDefinitions.createdAt);
}

/**
 * Active custom connectors this org can currently use in a conversation.
 */
export async function hasActiveCustomConnector(
  organizationId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: connectorDefinitions.id })
    .from(connectorDefinitions)
    .where(
      and(
        eq(connectorDefinitions.organizationId, organizationId),
        eq(connectorDefinitions.definitionStatus, "active"),
        eq(connectorDefinitions.connectionStatus, "active"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

export async function createConnectorDefinition(
  input: ConnectorDefinitionConfig,
): Promise<string> {
  const secret = encryptToken(input.clientSecret);
  const id = randomUUID();
  await db.insert(connectorDefinitions).values({
    id,
    organizationId: input.organizationId,
    slug: input.slug,
    displayName: input.displayName,
    icon: input.icon,
    description: input.description,
    authorizeUrl: input.authorizeUrl,
    tokenUrl: input.tokenUrl,
    scopes: input.scopes,
    scopeDelimiter: input.scopeDelimiter,
    clientId: input.clientId,
    encryptedClientSecret: secret.ciphertext,
    clientSecretIv: secret.iv,
    clientSecretAuthTag: secret.authTag,
    accountIdentifierUrl: input.accountIdentifierUrl,
    accountIdentifierField: input.accountIdentifierField,
    actions: input.actions,
    createdByWorkosUserId: input.createdByWorkosUserId,
  });
  return id;
}

/**
 * Updates a definition's configuration. `clientSecret` is left unchanged
 * when omitted (an admin editing a connector doesn't need to re-paste a
 * secret they can no longer see).
 */
export async function updateConnectorDefinition(input: {
  organizationId: string;
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
}): Promise<void> {
  const secret = input.clientSecret ? encryptToken(input.clientSecret) : null;
  await db
    .update(connectorDefinitions)
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
        encryptedClientSecret: secret.ciphertext,
        clientSecretIv: secret.iv,
        clientSecretAuthTag: secret.authTag,
      }),
      accountIdentifierUrl: input.accountIdentifierUrl,
      accountIdentifierField: input.accountIdentifierField,
      actions: input.actions,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(connectorDefinitions.id, input.id),
        eq(connectorDefinitions.organizationId, input.organizationId),
      ),
    );
}

export async function setConnectorDefinitionStatus(input: {
  organizationId: string;
  id: string;
  definitionStatus: "active" | "disabled";
}): Promise<void> {
  await db
    .update(connectorDefinitions)
    .set({ definitionStatus: input.definitionStatus, updatedAt: new Date() })
    .where(
      and(
        eq(connectorDefinitions.id, input.id),
        eq(connectorDefinitions.organizationId, input.organizationId),
      ),
    );
}

/**
 * Deletes a definition entirely, including its connection state.
 */
export async function deleteConnectorDefinition(input: {
  organizationId: string;
  id: string;
}): Promise<void> {
  await db
    .delete(connectorDefinitions)
    .where(
      and(
        eq(connectorDefinitions.id, input.id),
        eq(connectorDefinitions.organizationId, input.organizationId),
      ),
    );
}

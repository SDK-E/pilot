import { connectorDefinitions } from "@/db/schema";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

export interface ConnectorDefinitionSummary {
  id: string;
  slug: string;
  displayName: string;
  icon: string | null;
  description: string;
  definitionStatus: "active" | "disabled";
  connectionStatus: "not_connected" | "active" | "error";
  accountIdentifier: string | null;
  lastErrorMessage: string | null;
  actions: ConnectorDefinitionAction[];
}

/**
 * The non-secret config Settings needs to render and prefill an edit form.
 */
export interface ConnectorDefinitionForSettings extends ConnectorDefinitionSummary {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  scopes: string[];
  accountIdentifierUrl: string | null;
  accountIdentifierField: string | null;
}

export interface ConnectorDefinitionConfig {
  organizationId: string;
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
  createdByWorkosUserId: string;
}

export interface DecryptedConnectorDefinition {
  id: string;
  organizationId: string;
  slug: string;
  displayName: string;
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

export interface DecryptedConnectorDefinitionConnection {
  connectorDefinitionId: string;
  accountIdentifier: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: Date | null;
  grantedScopes: string[];
}

export const connectorDefinitionSummaryColumns = {
  id: connectorDefinitions.id,
  slug: connectorDefinitions.slug,
  displayName: connectorDefinitions.displayName,
  icon: connectorDefinitions.icon,
  description: connectorDefinitions.description,
  definitionStatus: connectorDefinitions.definitionStatus,
  connectionStatus: connectorDefinitions.connectionStatus,
  accountIdentifier: connectorDefinitions.accountIdentifier,
  lastErrorMessage: connectorDefinitions.lastErrorMessage,
  actions: connectorDefinitions.actions,
};

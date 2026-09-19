import { connectorDefinitions } from "@/db/schema";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

export interface ConnectorDefinitionSummary {
  id: string;
  slug: string;
  displayName: string;
  icon: string | null;
  description: string;
  definitionStatus: "active" | "disabled";
  allowPersonalConnections: boolean;
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
  allowPersonalConnections: boolean;
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
  allowPersonalConnections: boolean;
}

export interface DecryptedConnectorDefinitionConnection {
  connectionId: string;
  connectorDefinitionId: string;
  scope: "organization" | "personal";
  ownerWorkosUserId: string | null;
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
  allowPersonalConnections: connectorDefinitions.allowPersonalConnections,
  actions: connectorDefinitions.actions,
};

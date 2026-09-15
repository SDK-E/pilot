/**
 * Shared types and small fetch helpers for the connector provider
 * implementations under `src/connectors/providers/`.
 */
export const CONNECTOR_PROVIDER_IDS = [
  "github",
  "google",
  "slack",
  "notion",
  "linear",
  "vercel",
  "monday",
] as const;

export type ConnectorProviderId = (typeof CONNECTOR_PROVIDER_IDS)[number];

export function isConnectorProviderId(
  value: string,
): value is ConnectorProviderId {
  return (CONNECTOR_PROVIDER_IDS as readonly string[]).includes(value);
}

export interface ProviderTokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  grantedScopes: string[];
}

export interface ConnectorProvider {
  id: ConnectorProviderId;
  displayName: string;
  /**
  All seven providers here support an organization-shared connection.
  */
  supportsOrgScope: boolean;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: readonly string[];
  clientIdEnvVar: string;
  clientSecretEnvVar: string;
  exchangeCode(input: {
    code: string;
    redirectUri: string;
  }): Promise<ProviderTokenResult>;
  refreshAccessToken(refreshToken: string): Promise<ProviderTokenResult>;
  fetchAccountIdentifier(accessToken: string): Promise<string>;
}

export function envValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for this connector.`);
  return value;
}

export async function postForm(
  url: string,
  body: Record<string, string>,
  extraHeaders: Record<string, string> = {},
): Promise<unknown> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
      ...extraHeaders,
    },
    body: new URLSearchParams(body),
  });
  if (!response.ok) {
    throw new Error(`Token endpoint ${new URL(url).host} returned ${response.status}.`);
  }
  return response.json();
}

/**
 * Connector tool ids: the subset of `ToolId` that maps to a connector
 * provider.
 */
export const CONNECTOR_TOOL_IDS = [
  "connector-github",
  "connector-google-drive",
  "connector-gmail",
  "connector-slack",
  "connector-notion",
  "connector-linear",
  "connector-vercel",
  "connector-monday",
] as const;

export type ConnectorToolId = (typeof CONNECTOR_TOOL_IDS)[number];

export const TOOL_ID_PROVIDER: Record<ConnectorToolId, ConnectorProviderId> = {
  "connector-github": "github",
  "connector-google-drive": "google",
  "connector-gmail": "google",
  "connector-slack": "slack",
  "connector-notion": "notion",
  "connector-linear": "linear",
  "connector-vercel": "vercel",
  "connector-monday": "monday",
};

export function isConnectorToolId(value: string): value is ConnectorToolId {
  return (CONNECTOR_TOOL_IDS as readonly string[]).includes(value);
}

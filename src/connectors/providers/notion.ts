import { envValue } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
const TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const CLIENT_ID_ENV = "CONNECTOR_NOTION_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_NOTION_CLIENT_SECRET";

async function exchangeCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const basic = Buffer.from(
    `${envValue(CLIENT_ID_ENV)}:${envValue(CLIENT_SECRET_ENV)}`,
  ).toString("base64");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${basic}`,
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });
  if (!response.ok) throw new Error("Notion token exchange failed.");
  const data = (await response.json()) as {
    access_token?: string;
  };
  if (!data.access_token) throw new Error("Notion token exchange failed.");
  return {
    accessToken: data.access_token,
    // Notion internal integration tokens do not expire.
    refreshToken: null,
    expiresAt: null,
    grantedScopes: [],
  };
}

function refreshAccessToken(): never {
  throw new Error("Notion tokens do not support refresh; reconnect instead.");
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch("https://api.notion.com/v1/users/me", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      "notion-version": "2022-06-28",
    },
  });
  if (!response.ok) throw new Error("Could not read the Notion account.");
  const data = (await response.json()) as {
    bot?: { workspace_name?: string };
    name?: string;
  };
  return data.bot?.workspace_name ?? data.name ?? "Notion workspace";
}

/**
 * Notion permissions are set at install time via the integration's
 * capabilities, not requested as OAuth scope strings.
 */
export const notionProvider: ConnectorProvider = {
  id: "notion",
  displayName: "Notion",
  supportsOrgScope: true,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scopes: [],
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

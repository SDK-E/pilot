import { envValue } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://api.notion.com/v1/oauth/authorize";
const TOKEN_URL = "https://api.notion.com/v1/oauth/token";
const CLIENT_ID_ENV = "CONNECTOR_NOTION_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_NOTION_CLIENT_SECRET";

/**
 * Notion's `/v1/oauth/authorize` requires `owner=user` or the request is
 * invalid — the generic authorize route (which only sets client_id,
 * redirect_uri, scope, state, response_type) has no way to know that, so
 * every provider with an extra required param needs this override.
 */
function buildAuthorizeUrl({
  redirectUri,
  state,
}: {
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", envValue(CLIENT_ID_ENV));
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("owner", "user");
  url.searchParams.set("state", state);
  return url.href;
}

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
  buildAuthorizeUrl,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

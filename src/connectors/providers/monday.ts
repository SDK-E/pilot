import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://auth.monday.com/oauth2/authorize";
const TOKEN_URL = "https://auth.monday.com/oauth2/token";
const CLIENT_ID_ENV = "CONNECTOR_MONDAY_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_MONDAY_CLIENT_SECRET";

async function exchangeCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const data = (await postForm(TOKEN_URL, {
    client_id: envValue(CLIENT_ID_ENV),
    client_secret: envValue(CLIENT_SECRET_ENV),
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  })) as { access_token?: string; scope?: string };
  if (!data.access_token) throw new Error("Monday token exchange failed.");
  return {
    accessToken: data.access_token,
    refreshToken: null,
    expiresAt: null,
    grantedScopes: data.scope ? data.scope.split(" ") : [],
  };
}

function refreshAccessToken(): never {
  throw new Error(
    "Monday tokens from this flow do not support refresh; reconnect instead.",
  );
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: accessToken,
    },
    body: JSON.stringify({ query: "query { me { email } }" }),
  });
  if (!response.ok) throw new Error("Could not read the Monday account.");
  const data = (await response.json()) as {
    data?: { me?: { email?: string } };
  };
  const email = data.data?.me?.email;
  if (!email) throw new Error("Monday account had no email.");
  return email;
}

export const mondayProvider: ConnectorProvider = {
  id: "monday",
  displayName: "Monday",
  supportsOrgScope: true,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scopes: ["boards:read"],
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

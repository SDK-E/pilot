import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://linear.app/oauth/authorize";
const TOKEN_URL = "https://api.linear.app/oauth/token";
const CLIENT_ID_ENV = "CONNECTOR_LINEAR_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_LINEAR_CLIENT_SECRET";

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
  if (!data.access_token) throw new Error("Linear token exchange failed.");
  return {
    accessToken: data.access_token,
    refreshToken: null,
    expiresAt: null,
    grantedScopes: data.scope ? data.scope.split(",") : [],
  };
}

function refreshAccessToken(): never {
  throw new Error(
    "Linear tokens from this flow do not support refresh; reconnect instead.",
  );
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query: "query { viewer { email } }" }),
  });
  if (!response.ok) throw new Error("Could not read the Linear account.");
  const data = (await response.json()) as {
    data?: { viewer?: { email?: string } };
  };
  const email = data.data?.viewer?.email;
  if (!email) throw new Error("Linear account had no email.");
  return email;
}

export const linearProvider: ConnectorProvider = {
  id: "linear",
  displayName: "Linear",
  supportsOrgScope: true,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scopes: ["read"],
  // Linear's scope param is comma-separated, matching how exchangeCode
  // above already parses the response. A no-op today (single scope), but
  // matters the moment a second scope is added.
  scopeDelimiter: ",",
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

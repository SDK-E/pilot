import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://vercel.com/oauth/authorize";
const TOKEN_URL = "https://api.vercel.com/v2/oauth/access_token";
const CLIENT_ID_ENV = "CONNECTOR_VERCEL_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_VERCEL_CLIENT_SECRET";

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
  })) as { access_token?: string };
  if (!data.access_token) throw new Error("Vercel token exchange failed.");
  return {
    accessToken: data.access_token,
    refreshToken: null,
    expiresAt: null,
    grantedScopes: [],
  };
}

function refreshAccessToken(): never {
  throw new Error(
    "Vercel tokens from this flow do not support refresh; reconnect instead.",
  );
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Could not read the Vercel account.");
  const data = (await response.json()) as {
    user?: { username?: string; email?: string };
  };
  const identifier = data.user?.username ?? data.user?.email;
  if (!identifier) throw new Error("Vercel account had no identifier.");
  return identifier;
}

// eslint-disable-next-line sonarjs/todo-tag -- intentional, tracked flag for an unverified API detail, not a stray note
// TODO(connectors): verify against Vercel's current OAuth integration docs
// before enabling in production — the authorize/token endpoints and the
// lack of a `scope` request param (scopes are fixed by the integration's
// configuration, not requested per-authorization) are drawn from Vercel's
// general integration pattern, not confirmed against live docs here.
export const vercelProvider: ConnectorProvider = {
  id: "vercel",
  displayName: "Vercel",
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

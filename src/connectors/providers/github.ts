import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const TOKEN_URL = "https://github.com/login/oauth/access_token";
const CLIENT_ID_ENV = "CONNECTOR_GITHUB_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_GITHUB_CLIENT_SECRET";

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
  })) as { access_token?: string; scope?: string };
  if (!data.access_token) throw new Error("GitHub token exchange failed.");
  return {
    accessToken: data.access_token,
    // GitHub OAuth app tokens (classic flow) do not expire and carry no
    // refresh token by default.
    refreshToken: null,
    expiresAt: null,
    grantedScopes: data.scope ? data.scope.split(",") : [],
  };
}

function refreshAccessToken(): never {
  throw new Error(
    "GitHub OAuth app tokens do not support refresh; reconnect instead.",
  );
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) throw new Error("Could not read the GitHub account.");
  const data = (await response.json()) as { login?: string };
  if (!data.login) throw new Error("GitHub account had no login.");
  return data.login;
}

/**
 * GitHub OAuth apps have no narrower read-only scope for issues/PRs than
 * "repo"; "read:user" reads the profile for the account identifier.
 */
export const githubProvider: ConnectorProvider = {
  id: "github",
  displayName: "GitHub",
  supportsOrgScope: true,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scopes: ["repo", "read:user"],
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

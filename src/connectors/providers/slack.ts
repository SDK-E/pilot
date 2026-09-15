import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const TOKEN_URL = "https://slack.com/api/oauth.v2.access";
const CLIENT_ID_ENV = "CONNECTOR_SLACK_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_SLACK_CLIENT_SECRET";

interface SlackOAuthResponse {
  ok?: boolean;
  authed_user?: { access_token?: string };
  access_token?: string;
  scope?: string;
}

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
  })) as SlackOAuthResponse;
  const accessToken = data.authed_user?.access_token ?? data.access_token;
  if (!accessToken || !data.ok) throw new Error("Slack token exchange failed.");
  return {
    accessToken,
    // Slack v2 OAuth tokens don't expire by default.
    refreshToken: null,
    expiresAt: null,
    grantedScopes: data.scope ? data.scope.split(",") : [],
  };
}

function refreshAccessToken(): never {
  throw new Error(
    "Slack tokens from this flow do not support refresh; reconnect instead.",
  );
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch("https://slack.com/api/team.info", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const data = (await response.json()) as {
    ok?: boolean;
    team?: { name?: string };
  };
  if (!data.ok || !data.team?.name) {
    throw new Error("Could not read the Slack workspace.");
  }
  return data.team.name;
}

export const slackProvider: ConnectorProvider = {
  id: "slack",
  displayName: "Slack",
  supportsOrgScope: true,
  authorizeUrl: AUTHORIZE_URL,
  tokenUrl: TOKEN_URL,
  scopes: ["channels:read", "channels:history"],
  // Slack's OAuth v2 scope param is comma-separated, matching how
  // exchangeCode above already parses the response.
  scopeDelimiter: ",",
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

/**
 * The connector provider registry: one plain-fetch OAuth2 implementation per
 * provider, all shaped to the same `ConnectorProvider` contract. See
 * docs/decisions/0019-connectors.md for the product shape (personal vs.
 * organization connections, single default per scope, read-only for now).
 *
 * Every provider integration here is a small, isolated function so a wrong
 * endpoint/param name is a one-line fix later — see the TODO comments on
 * providers whose exact OAuth/API shape was not verified against current
 * docs while writing this.
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
  /** All seven providers here support an organization-shared connection. */
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

function envValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required for this connector.`);
  return value;
}

async function postForm(
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
    throw new Error(`Token endpoint ${url} returned ${response.status}.`);
  }
  return response.json();
}

// --- GitHub ---------------------------------------------------------------
// GitHub OAuth apps have no narrower read-only scope for issues/PRs than
// "repo"; "read:user" reads the profile for the account identifier.
const github: ConnectorProvider = {
  id: "github",
  displayName: "GitHub",
  supportsOrgScope: true,
  authorizeUrl: "https://github.com/login/oauth/authorize",
  tokenUrl: "https://github.com/login/oauth/access_token",
  scopes: ["repo", "read:user"],
  clientIdEnvVar: "CONNECTOR_GITHUB_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_GITHUB_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
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
  },
  refreshAccessToken() {
    throw new Error(
      "GitHub OAuth app tokens do not support refresh; reconnect instead.",
    );
  },
  async fetchAccountIdentifier(accessToken) {
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
  },
};

// --- Google -----------------------------------------------------------
const google: ConnectorProvider = {
  id: "google",
  displayName: "Google",
  supportsOrgScope: true,
  authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
  tokenUrl: "https://oauth2.googleapis.com/token",
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "email",
  ],
  clientIdEnvVar: "CONNECTOR_GOOGLE_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_GOOGLE_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    })) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!data.access_token) throw new Error("Google token exchange failed.");
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
      grantedScopes: data.scope ? data.scope.split(" ") : [],
    };
  },
  async refreshAccessToken(refreshToken) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    })) as { access_token?: string; expires_in?: number; scope?: string };
    if (!data.access_token) throw new Error("Google token refresh failed.");
    return {
      accessToken: data.access_token,
      refreshToken,
      expiresAt: data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000)
        : null,
      grantedScopes: data.scope ? data.scope.split(" ") : [],
    };
  },
  async fetchAccountIdentifier(accessToken) {
    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new Error("Could not read the Google account.");
    const data = (await response.json()) as { email?: string };
    if (!data.email) throw new Error("Google account had no email.");
    return data.email;
  },
};

// --- Slack ------------------------------------------------------------
// TODO(connectors): verify against Slack's current OAuth docs before
// enabling in production — the account-identifier fallback (team name) may
// need `identity.basic` and `users.identity` instead.
const slack: ConnectorProvider = {
  id: "slack",
  displayName: "Slack",
  supportsOrgScope: true,
  authorizeUrl: "https://slack.com/oauth/v2/authorize",
  tokenUrl: "https://slack.com/api/oauth.v2.access",
  scopes: ["channels:read", "channels:history"],
  clientIdEnvVar: "CONNECTOR_SLACK_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_SLACK_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
      code,
      redirect_uri: redirectUri,
    })) as {
      ok?: boolean;
      authed_user?: { access_token?: string };
      access_token?: string;
      scope?: string;
      team?: { name?: string };
    };
    const accessToken = data.authed_user?.access_token ?? data.access_token;
    if (!data.ok || !accessToken) throw new Error("Slack token exchange failed.");
    return {
      accessToken,
      // Slack v2 OAuth tokens don't expire by default.
      refreshToken: null,
      expiresAt: null,
      grantedScopes: data.scope ? data.scope.split(",") : [],
    };
  },
  refreshAccessToken() {
    throw new Error(
      "Slack tokens from this flow do not support refresh; reconnect instead.",
    );
  },
  async fetchAccountIdentifier(accessToken) {
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
  },
};

// --- Notion -------------------------------------------------------------
// Notion permissions are set at install time via the integration's
// capabilities, not requested as OAuth scope strings.
const notion: ConnectorProvider = {
  id: "notion",
  displayName: "Notion",
  supportsOrgScope: true,
  authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
  tokenUrl: "https://api.notion.com/v1/oauth/token",
  scopes: [],
  clientIdEnvVar: "CONNECTOR_NOTION_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_NOTION_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const basic = Buffer.from(
      `${envValue(this.clientIdEnvVar)}:${envValue(this.clientSecretEnvVar)}`,
    ).toString("base64");
    const response = await fetch(this.tokenUrl, {
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
      workspace_name?: string;
    };
    if (!data.access_token) throw new Error("Notion token exchange failed.");
    return {
      accessToken: data.access_token,
      // Notion internal integration tokens do not expire.
      refreshToken: null,
      expiresAt: null,
      grantedScopes: [],
    };
  },
  refreshAccessToken() {
    throw new Error(
      "Notion tokens do not support refresh; reconnect instead.",
    );
  },
  async fetchAccountIdentifier(accessToken) {
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
  },
};

// --- Linear -----------------------------------------------------------
const linear: ConnectorProvider = {
  id: "linear",
  displayName: "Linear",
  supportsOrgScope: true,
  authorizeUrl: "https://linear.app/oauth/authorize",
  tokenUrl: "https://api.linear.app/oauth/token",
  scopes: ["read"],
  clientIdEnvVar: "CONNECTOR_LINEAR_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_LINEAR_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
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
  },
  refreshAccessToken() {
    throw new Error(
      "Linear tokens from this flow do not support refresh; reconnect instead.",
    );
  },
  async fetchAccountIdentifier(accessToken) {
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
  },
};

// --- Vercel -------------------------------------------------------------
// TODO(connectors): verify against Vercel's current OAuth integration docs
// before enabling in production — the authorize/token endpoints and the
// lack of a `scope` request param (scopes are fixed by the integration's
// configuration, not requested per-authorization) are drawn from Vercel's
// general integration pattern, not confirmed against live docs here.
const vercel: ConnectorProvider = {
  id: "vercel",
  displayName: "Vercel",
  supportsOrgScope: true,
  authorizeUrl: "https://vercel.com/oauth/authorize",
  tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
  scopes: [],
  clientIdEnvVar: "CONNECTOR_VERCEL_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_VERCEL_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
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
  },
  refreshAccessToken() {
    throw new Error(
      "Vercel tokens from this flow do not support refresh; reconnect instead.",
    );
  },
  async fetchAccountIdentifier(accessToken) {
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
  },
};

// --- Monday -------------------------------------------------------------
const monday: ConnectorProvider = {
  id: "monday",
  displayName: "Monday",
  supportsOrgScope: true,
  authorizeUrl: "https://auth.monday.com/oauth2/authorize",
  tokenUrl: "https://auth.monday.com/oauth2/token",
  scopes: ["boards:read"],
  clientIdEnvVar: "CONNECTOR_MONDAY_CLIENT_ID",
  clientSecretEnvVar: "CONNECTOR_MONDAY_CLIENT_SECRET",
  async exchangeCode({ code, redirectUri }) {
    const data = (await postForm(this.tokenUrl, {
      client_id: envValue(this.clientIdEnvVar),
      client_secret: envValue(this.clientSecretEnvVar),
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
  },
  refreshAccessToken() {
    throw new Error(
      "Monday tokens from this flow do not support refresh; reconnect instead.",
    );
  },
  async fetchAccountIdentifier(accessToken) {
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
  },
};

export const CONNECTOR_PROVIDERS: Record<ConnectorProviderId, ConnectorProvider> = {
  github,
  google,
  slack,
  notion,
  linear,
  vercel,
  monday,
};

export function connectorProvider(id: ConnectorProviderId): ConnectorProvider {
  return CONNECTOR_PROVIDERS[id];
}

/**
 * Connector tool ids: the subset of `ToolId` that maps to a connector
 * provider. Declared here (rather than imported from agent-kinds, to avoid a
 * cycle) and re-used by agent-kinds/agent-tools via a shared literal list.
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

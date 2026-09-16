import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

// The public URL slug of the "Pilot" OAuth2 integration in the Vercel
// Integrations Console — not secret, it's part of the public marketplace
// URL. Update this if the integration is ever renamed/recreated with a
// different slug.
const INTEGRATION_SLUG = "pilot";
const TOKEN_URL = "https://api.vercel.com/v2/oauth/access_token";
const CLIENT_ID_ENV = "CONNECTOR_VERCEL_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_VERCEL_CLIENT_SECRET";

/**
 * Vercel's OAuth2 integrations don't use a standard authorize endpoint —
 * there's no `authorize?client_id=...` shape at all. The "external
 * installation flow" starts at a slug-based URL and Vercel appends `code`,
 * `teamId`, `configurationId`, `state`, and `source` to the caller-supplied
 * `next` URL when redirecting back
 * (https://vercel.com/docs/integrations/create-integration/submit-integration#external-installation-flow).
 */
function buildAuthorizeUrl({
  redirectUri,
  state,
}: {
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(
    `https://vercel.com/integrations/${INTEGRATION_SLUG}/new`,
  );
  url.searchParams.set("next", redirectUri);
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

export const vercelProvider: ConnectorProvider = {
  id: "vercel",
  displayName: "Vercel",
  supportsOrgScope: true,
  // Vestigial for Vercel — buildAuthorizeUrl below is what's actually used,
  // but the shared ConnectorProvider shape still expects a base URL.
  authorizeUrl: `https://vercel.com/integrations/${INTEGRATION_SLUG}/new`,
  tokenUrl: TOKEN_URL,
  scopes: [],
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  buildAuthorizeUrl,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

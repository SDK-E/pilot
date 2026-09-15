import { envValue, postForm } from "@/connectors/connector-provider-types";

import type { ConnectorProvider } from "@/connectors/connector-provider-types";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const CLIENT_ID_ENV = "CONNECTOR_GOOGLE_CLIENT_ID";
const CLIENT_SECRET_ENV = "CONNECTOR_GOOGLE_CLIENT_SECRET";

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

function expiresAt(expiresIn: number | undefined): Date | null {
  return expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
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
    grant_type: "authorization_code",
  })) as GoogleTokenResponse;
  if (!data.access_token) throw new Error("Google token exchange failed.");
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: expiresAt(data.expires_in),
    grantedScopes: data.scope ? data.scope.split(" ") : [],
  };
}

async function refreshAccessToken(refreshToken: string) {
  const data = (await postForm(TOKEN_URL, {
    client_id: envValue(CLIENT_ID_ENV),
    client_secret: envValue(CLIENT_SECRET_ENV),
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  })) as GoogleTokenResponse;
  if (!data.access_token) throw new Error("Google token refresh failed.");
  return {
    accessToken: data.access_token,
    refreshToken,
    expiresAt: expiresAt(data.expires_in),
    grantedScopes: data.scope ? data.scope.split(" ") : [],
  };
}

async function fetchAccountIdentifier(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error("Could not read the Google account.");
  const data = (await response.json()) as { email?: string };
  if (!data.email) throw new Error("Google account had no email.");
  return data.email;
}

/**
 * One Google connection covers both the Gmail and Google Drive tools;
 * `access_type=offline&prompt=consent` forces a refresh token every time.
 */
export const googleProvider: ConnectorProvider = {
  id: "google",
  displayName: "Google",
  supportsOrgScope: true,
  authorizeUrl: `${AUTHORIZE_URL}?access_type=offline&prompt=consent`,
  tokenUrl: TOKEN_URL,
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "email",
  ],
  clientIdEnvVar: CLIENT_ID_ENV,
  clientSecretEnvVar: CLIENT_SECRET_ENV,
  exchangeCode,
  refreshAccessToken,
  fetchAccountIdentifier,
};

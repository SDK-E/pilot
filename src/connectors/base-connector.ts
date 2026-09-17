/**
 * Generic OAuth2 authorization-code exchange/refresh for a connector
 * definition — the only OAuth implementation in this codebase. Every
 * connector (a Pilot-seeded one like GitHub/Slack, or one an admin adds from
 * Settings) is a row in `connector_definitions`; this module is what drives
 * all of them, not a per-provider hand-written client.
 */
import "server-only";

import type { DecryptedConnectorDefinition } from "@/connectors/connector-definition-types";

/**
 * Posts a `application/x-www-form-urlencoded` request — every OAuth2 token
 * endpoint's shape — and parses the JSON response.
 */
async function postForm(
  url: string,
  body: Record<string, string | undefined>,
): Promise<unknown> {
  const filtered: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value !== undefined) filtered[key] = value;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: new URLSearchParams(filtered),
  });
  if (!response.ok) {
    throw new Error(
      `Token endpoint ${new URL(url).host} returned ${response.status}.`,
    );
  }
  return response.json();
}

interface TokenResult {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  grantedScopes: string[];
}

function parseTokenResponse(data: unknown): TokenResult {
  const body = data as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
  };
  if (!body.access_token) {
    throw new Error("Token endpoint did not return an access token.");
  }
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt: body.expires_in
      ? new Date(Date.now() + body.expires_in * 1000)
      : null,
    grantedScopes: body.scope ? body.scope.split(/[,\s]+/).filter(Boolean) : [],
  };
}

export async function exchangeDefinitionCode(
  definition: DecryptedConnectorDefinition,
  input: { code: string; redirectUri: string },
): Promise<TokenResult> {
  const data = await postForm(definition.tokenUrl, {
    client_id: definition.clientId,
    client_secret: definition.clientSecret,
    code: input.code,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
  return parseTokenResponse(data);
}

export async function refreshDefinitionToken(
  definition: DecryptedConnectorDefinition,
  refreshToken: string,
): Promise<TokenResult> {
  const data = await postForm(definition.tokenUrl, {
    client_id: definition.clientId,
    client_secret: definition.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  return parseTokenResponse(data);
}

/**
Reads a dot-path (e.g. "team.name") out of a parsed JSON value.
*/
export function readDotPath(value: unknown, path: string): unknown {
  let current: unknown = value;
  for (const key of path.split(".")) {
    if (!current || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export async function fetchDefinitionAccountIdentifier(
  definition: DecryptedConnectorDefinition,
  accessToken: string,
): Promise<string> {
  if (!definition.accountIdentifierUrl) return "Connected account";
  const response = await fetch(definition.accountIdentifierUrl, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(
      `Could not read the connected account (${response.status}).`,
    );
  }
  const data: unknown = await response.json();
  const identifier = definition.accountIdentifierField
    ? readDotPath(data, definition.accountIdentifierField)
    : undefined;
  return typeof identifier === "string" && identifier.length > 0
    ? identifier
    : "Connected account";
}

export function buildDefinitionAuthorizeUrl(
  definition: DecryptedConnectorDefinition,
  input: { redirectUri: string; state: string },
): string {
  const url = new URL(definition.authorizeUrl);
  url.searchParams.set("client_id", definition.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  if (definition.scopes.length > 0) {
    url.searchParams.set(
      "scope",
      definition.scopes.join(definition.scopeDelimiter || " "),
    );
  }
  url.searchParams.set("state", input.state);
  url.searchParams.set("response_type", "code");
  return url.href;
}

import "server-only";

import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

import { PilotAiRuntimeError } from "./runtime-contract";

const tokenHeader = "x-pilot-runtime-token";
const TOKEN_REFRESH_MARGIN_MS = 30_000;

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().positive(),
});

function authkitDomain(): string {
  const value = process.env.WORKOS_M2M_AUTHKIT_DOMAIN?.trim();
  if (!value) {
    throw new PilotAiRuntimeError(
      "Pilot is not configured with a WorkOS M2M AuthKit domain.",
    );
  }
  return value;
}

function clientId(): string {
  const value = process.env.WORKOS_M2M_CLIENT_ID?.trim();
  if (!value) {
    throw new PilotAiRuntimeError(
      "Pilot is not configured with a WorkOS M2M client ID.",
    );
  }
  return value;
}

function clientSecret(): string {
  const value = process.env.WORKOS_M2M_CLIENT_SECRET?.trim();
  if (!value) {
    throw new PilotAiRuntimeError(
      "Pilot is not configured with a WorkOS M2M client secret.",
    );
  }
  return value;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

const tokenCache: { current?: CachedToken } = {};

function isFresh(cached: CachedToken | undefined): cached is CachedToken {
  return (
    cached !== undefined &&
    cached.expiresAt > Date.now() + TOKEN_REFRESH_MARGIN_MS
  );
}

async function requestPilotRuntimeToken(): Promise<CachedToken> {
  const response = await fetch(new URL("/oauth2/token", authkitDomain()), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId(),
      client_secret: clientSecret(),
    }),
  });
  if (!response.ok) {
    throw new PilotAiRuntimeError(
      `WorkOS M2M token request returned ${response.status}.`,
    );
  }
  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new PilotAiRuntimeError("WorkOS M2M token response was malformed.");
  }
  return {
    token: parsed.data.access_token,
    expiresAt: Date.now() + parsed.data.expires_in * 1000,
  };
}

/**
 * Mints (and caches) the token Pilot AI verifies to confirm a request
 * genuinely came from Pilot: WorkOS M2M client_credentials, scoped to
 * Pilot's own Connect application. The same token is echoed back by Pilot AI
 * for its runtime callbacks and verified again here by
 * `isVerifiedPilotRuntimeCallback`.
 */
export async function getPilotRuntimeToken(): Promise<string> {
  const fresh = isFresh(tokenCache.current)
    ? tokenCache.current
    : await requestPilotRuntimeToken();
  tokenCache.current = fresh;
  return fresh.token;
}

/**
 * Verifies Pilot AI's runtime callback (`/api/runtime/*`): it simply relays
 * the same WorkOS M2M token Pilot minted for the original request, so this
 * checks the identical thing Pilot AI checks on the forward call — valid
 * signature via that AuthKit environment's JWKS, and `sub` equal to Pilot's
 * own client ID.
 */
export async function isVerifiedPilotRuntimeCallback(
  request: Request,
): Promise<boolean> {
  const token = request.headers.get(tokenHeader);
  if (!token) return false;

  try {
    const { payload } = await jwtVerify(
      token,
      createRemoteJWKSet(new URL(`${authkitDomain()}/oauth2/jwks`)),
      { issuer: authkitDomain() },
    );
    return payload.sub === clientId();
  } catch {
    return false;
  }
}

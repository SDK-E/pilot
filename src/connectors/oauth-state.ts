/**
 * Signed OAuth `state` for the custom-connector flow — the same HMAC
 * mechanism as `oauth-state.ts`, kept as a separate module (rather than
 * widening that one's `ConnectorProviderId`-typed payload) since a custom
 * connector is identified by a `connectorDefinitionId`, not a fixed provider
 * id. Reuses `CONNECTOR_STATE_SIGNING_SECRET`.
 */
import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_AGE_MS = 10 * 60 * 1000;

export interface CustomOAuthStatePayload {
  organizationId: string;
  userId: string;
  connectorDefinitionId: string;
  scope: "organization" | "personal";
}

interface SignedCustomOAuthState extends CustomOAuthStatePayload {
  issuedAt: number;
}

function signingSecret(): string {
  const value = process.env.CONNECTOR_STATE_SIGNING_SECRET?.trim();
  if (!value) {
    throw new Error(
      "CONNECTOR_STATE_SIGNING_SECRET is required to start a connector OAuth flow.",
    );
  }
  return value;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(encodedPayload: string): string {
  return base64url(
    createHmac("sha256", signingSecret()).update(encodedPayload).digest(),
  );
}

export function signCustomOAuthState(payload: CustomOAuthStatePayload): string {
  const signed: SignedCustomOAuthState = { ...payload, issuedAt: Date.now() };
  const encodedPayload = base64url(JSON.stringify(signed));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function isSignedCustomOAuthState(
  value: unknown,
): value is SignedCustomOAuthState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.organizationId === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.connectorDefinitionId === "string" &&
    (candidate.scope === "organization" || candidate.scope === "personal") &&
    typeof candidate.issuedAt === "number"
  );
}

export function verifyCustomOAuthState(
  token: string,
): SignedCustomOAuthState | null {
  const [encodedPayload, encodedSignature] = token.split(".", 2);
  if (!encodedPayload || !encodedSignature) return null;

  const expectedSignature = Buffer.from(sign(encodedPayload));
  const actualSignature = Buffer.from(encodedSignature);
  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
  } catch {
    return null;
  }
  if (!isSignedCustomOAuthState(parsed)) return null;
  if (Date.now() - parsed.issuedAt > MAX_AGE_MS) return null;
  return parsed;
}

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { isConnectorProviderId } from "@/connectors/connector-providers";

import type { ConnectorProviderId } from "@/connectors/connector-providers";

const MAX_AGE_MS = 10 * 60 * 1000;

export interface OAuthStatePayload {
  organizationId: string;
  userId: string;
  providerId: ConnectorProviderId;
  ownerScope: "organization" | "user";
}

interface SignedOAuthState extends OAuthStatePayload {
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

export function signOAuthState(payload: OAuthStatePayload): string {
  const signed: SignedOAuthState = { ...payload, issuedAt: Date.now() };
  const encodedPayload = base64url(JSON.stringify(signed));
  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function isSignedOAuthState(value: unknown): value is SignedOAuthState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.organizationId === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.providerId === "string" &&
    isConnectorProviderId(candidate.providerId) &&
    (candidate.ownerScope === "organization" ||
      candidate.ownerScope === "user") &&
    typeof candidate.issuedAt === "number"
  );
}

export function verifyOAuthState(token: string): SignedOAuthState | null {
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
  if (!isSignedOAuthState(parsed)) return null;
  if (Date.now() - parsed.issuedAt > MAX_AGE_MS) return null;
  return parsed;
}

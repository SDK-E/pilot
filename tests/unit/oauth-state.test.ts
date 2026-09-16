import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";

import { signOAuthState, verifyOAuthState } from "@/connectors/oauth-state";

// Not a real secret — a fixed fixture value assigned to
// CONNECTOR_STATE_SIGNING_SECRET for this test file only, so signForTest()
// below can independently reconstruct the HMAC oauth-state.ts computes
// (needed to test expiry without a manually-built payload always failing
// the signature check first). sonarjs's hardcoded-secret heuristic still
// flags a literal string passed to createHmac, hence the disable below.
const testFixtureSigningSecret = "connector-oauth-state-test-fixture-key";

function signForTest(encodedPayload: string): string {
  // eslint-disable-next-line sonarjs/hardcoded-secret-signatures -- test fixture key, not a real secret; see comment above
  return createHmac("sha256", testFixtureSigningSecret)
    .update(encodedPayload)
    .digest("base64url");
}

const originalSecret = process.env.CONNECTOR_STATE_SIGNING_SECRET;

beforeEach(() => {
  process.env.CONNECTOR_STATE_SIGNING_SECRET = testFixtureSigningSecret;
});

afterEach(() => {
  process.env.CONNECTOR_STATE_SIGNING_SECRET = originalSecret;
});

const payload = {
  organizationId: "org_1",
  userId: "user_1",
  providerId: "github" as const,
  ownerScope: "user" as const,
};

test("a signed state round-trips back to its original payload", () => {
  const state = signOAuthState(payload);
  const verified = verifyOAuthState(state);
  assert.ok(verified);
  assert.equal(verified.organizationId, payload.organizationId);
  assert.equal(verified.userId, payload.userId);
  assert.equal(verified.providerId, payload.providerId);
  assert.equal(verified.ownerScope, payload.ownerScope);
});

test("a tampered payload fails signature verification", () => {
  const state = signOAuthState(payload);
  const [, signature] = state.split(".", 2);
  const tamperedPayload = Buffer.from(
    JSON.stringify({
      ...payload,
      organizationId: "org_attacker",
      issuedAt: Date.now(),
    }),
  ).toString("base64url");
  assert.equal(verifyOAuthState(`${tamperedPayload}.${signature}`), null);
});

test("a state signed with a different secret is rejected", () => {
  const state = signOAuthState(payload);
  process.env.CONNECTOR_STATE_SIGNING_SECRET = "a-different-secret";
  assert.equal(verifyOAuthState(state), null);
});

test("a malformed token is rejected without throwing", () => {
  assert.equal(verifyOAuthState("not-a-valid-token"), null);
  assert.equal(verifyOAuthState(""), null);
  assert.equal(verifyOAuthState("only-one-part"), null);
});

test("an expired state is rejected", () => {
  const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, issuedAt: elevenMinutesAgo }),
  ).toString("base64url");
  const state = `${encodedPayload}.${signForTest(encodedPayload)}`;
  assert.equal(verifyOAuthState(state), null);
});

test("a state issued just under the ten-minute limit is still accepted", () => {
  const nineMinutesAgo = Date.now() - 9 * 60 * 1000;
  const encodedPayload = Buffer.from(
    JSON.stringify({ ...payload, issuedAt: nineMinutesAgo }),
  ).toString("base64url");
  const state = `${encodedPayload}.${signForTest(encodedPayload)}`;
  assert.ok(verifyOAuthState(state));
});

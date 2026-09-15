import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { afterEach, beforeEach, test } from "node:test";

import { isValidMarketplaceWebhookSignature } from "@/connectors/github-marketplace-webhook";

// Not a real secret — a fixed fixture value assigned to
// GITHUB_MARKETPLACE_WEBHOOK_SECRET for this test file only.
const testFixtureSecret = "github-marketplace-webhook-test-fixture-key";

function signForTest(rawBody: string, secret = testFixtureSecret): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

const originalSecret = process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET;

beforeEach(() => {
  process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET = testFixtureSecret;
});

afterEach(() => {
  process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET = originalSecret;
});

const body = JSON.stringify({ action: "purchased" });

test("a correctly signed body is accepted", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(body, signForTest(body)),
    true,
  );
});

test("a signature computed with the wrong secret is rejected", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(body, signForTest(body, "wrong-secret")),
    false,
  );
});

test("a signature over a different body is rejected", () => {
  const signatureForOtherBody = signForTest(
    JSON.stringify({ action: "cancelled" }),
  );
  assert.equal(
    isValidMarketplaceWebhookSignature(body, signatureForOtherBody),
    false,
  );
});

test("a missing signature header is rejected", () => {
  assert.equal(isValidMarketplaceWebhookSignature(body, null), false);
});

test("a signature missing the sha256= prefix is rejected", () => {
  const raw = signForTest(body).slice("sha256=".length);
  assert.equal(isValidMarketplaceWebhookSignature(body, raw), false);
});

test("a malformed (non-hex) signature is rejected without throwing", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(body, "sha256=not-hex-at-all"),
    false,
  );
});

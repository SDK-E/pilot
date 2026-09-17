import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";

import { isValidMarketplaceWebhookSignature } from "@/connectors/github-marketplace-webhook";

const testFixtureSecret = "github-marketplace-webhook-test-fixture-key";

function signForTest(rawBody: string, secret = testFixtureSecret): string {
  return `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
}

const body = JSON.stringify({ action: "purchased" });

test("a correctly signed body is accepted", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(
      body,
      signForTest(body),
      testFixtureSecret,
    ),
    true,
  );
});

test("a signature computed with the wrong secret is rejected", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(
      body,
      signForTest(body, "wrong-secret"),
      testFixtureSecret,
    ),
    false,
  );
});

test("a signature over a different body is rejected", () => {
  const signatureForOtherBody = signForTest(
    JSON.stringify({ action: "cancelled" }),
  );
  assert.equal(
    isValidMarketplaceWebhookSignature(
      body,
      signatureForOtherBody,
      testFixtureSecret,
    ),
    false,
  );
});

test("a missing signature header is rejected", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(body, null, testFixtureSecret),
    false,
  );
});

test("a signature missing the sha256= prefix is rejected", () => {
  const raw = signForTest(body).slice("sha256=".length);
  assert.equal(
    isValidMarketplaceWebhookSignature(body, raw, testFixtureSecret),
    false,
  );
});

test("a malformed (non-hex) signature is rejected without throwing", () => {
  assert.equal(
    isValidMarketplaceWebhookSignature(
      body,
      "sha256=not-hex-at-all",
      testFixtureSecret,
    ),
    false,
  );
});

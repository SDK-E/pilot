import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

function webhookSecret(): string {
  const value = process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET?.trim();
  if (!value) {
    throw new Error(
      "GITHUB_MARKETPLACE_WEBHOOK_SECRET is required to verify GitHub Marketplace webhooks.",
    );
  }
  return value;
}

/**
 * Verifies GitHub's `X-Hub-Signature-256` header: an HMAC-SHA256 of the
 * raw, unparsed request body. Call this before parsing the body as JSON.
 */
export function isValidMarketplaceWebhookSignature(
  rawBody: string,
  header: string | null,
): boolean {
  if (!header?.startsWith(SIGNATURE_PREFIX)) return false;
  const expected = createHmac("sha256", webhookSecret())
    .update(rawBody)
    .digest("hex");
  const provided = header.slice(SIGNATURE_PREFIX.length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

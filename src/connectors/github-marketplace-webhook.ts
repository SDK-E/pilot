import { createHmac, timingSafeEqual } from "node:crypto";

const SIGNATURE_PREFIX = "sha256=";

/**
 * Verifies GitHub's `X-Hub-Signature-256` header: an HMAC-SHA256 of the
 * raw, unparsed request body. Call this before parsing the body as JSON.
 * The caller supplies `secret`, resolved from `platform-secret-repository.ts`.
 * This function has no database dependency and its tests need no mocking.
 */
export function isValidMarketplaceWebhookSignature(
  rawBody: string,
  header: string | null,
  secret: string,
): boolean {
  if (!header?.startsWith(SIGNATURE_PREFIX)) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const provided = header.slice(SIGNATURE_PREFIX.length);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(provided, "hex");
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

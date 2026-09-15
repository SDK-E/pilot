import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

export const runtime = "nodejs";

const SIGNATURE_HEADER = "x-hub-signature-256";
const SIGNATURE_PREFIX = "sha256=";

const marketplacePurchaseEventSchema = z.object({
  action: z.enum([
    "purchased",
    "changed",
    "cancelled",
    "pending_change",
    "pending_change_cancelled",
  ]),
  effective_date: z.string().optional(),
  marketplace_purchase: z
    .object({
      account: z
        .object({ id: z.number(), login: z.string().optional() })
        .optional(),
      plan: z.object({ id: z.number(), name: z.string() }).optional(),
    })
    .optional(),
});

function webhookSecret(): string {
  const value = process.env.GITHUB_MARKETPLACE_WEBHOOK_SECRET?.trim();
  if (!value) {
    throw new Error(
      "GITHUB_MARKETPLACE_WEBHOOK_SECRET is required to verify GitHub Marketplace webhooks.",
    );
  }
  return value;
}

function isValidSignature(rawBody: string, header: string | null): boolean {
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

/**
 * GitHub Marketplace's `marketplace_purchase` webhook — fired when a user
 * installs ("purchases", even on the Free plan), changes, or cancels the
 * Pilot GitHub Marketplace listing. This is verified by an HMAC signature
 * over the raw body, not a WorkOS session: GitHub calls this server-to-
 * server, so it is intentionally excluded from `src/proxy.ts`'s matcher.
 * Pilot has no billing/plan logic tied to this listing today, so the
 * handler only logs the event and acknowledges it — GitHub requires the
 * endpoint to exist and return 2xx, nothing downstream depends on the
 * payload yet.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!isValidSignature(rawBody, request.headers.get(SIGNATURE_HEADER))) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const event = marketplacePurchaseEventSchema.safeParse(parsedBody);
  if (!event.success) {
    // Acknowledge unrecognized event shapes rather than failing — GitHub
    // retries on non-2xx, and an unrecognized shape isn't retryable.
    return new Response(null, { status: 204 });
  }

  // No plan/billing logic in Pilot today — acknowledging is all GitHub
  // requires. If a future change needs the payload (e.g. tracking listing
  // installs), read `event.data` here rather than widening this comment.
  return new Response(null, { status: 204 });
}

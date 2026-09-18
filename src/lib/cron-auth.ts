import "server-only";

import {
  CRON_SECRET_KEY,
  getPlatformSecret,
} from "@/platform/platform-secret-repository";

/**
 * Shared authentication for every `/api/cron/*` route: verifies the request
 * carries `Authorization: Bearer <secret>`, where `<secret>` is the
 * admin-managed `cron_secret` platform secret (`/admin/connector-providers`,
 * see ADR-0024) — not an env var, so rotating it needs no deploy, only
 * updating the same value in the external scheduler's (cron-job.org) saved
 * header. None of these routes follow AGENTS.md's "every route starts with
 * `getWorkspaceSession()`" rule — there is no WorkOS session for a
 * system-to-system cron invocation — and none are listed in `src/proxy.ts`'s
 * matcher, since that middleware exists to attach a WorkOS session.
 */
export async function isVerifiedCronRequest(
  request: Request,
): Promise<boolean> {
  const secret = await getPlatformSecret(CRON_SECRET_KEY);
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

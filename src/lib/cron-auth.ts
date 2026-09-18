/**
 * Shared authentication for every `/api/cron/*` route: verifies the request
 * carries `Authorization: Bearer ${CRON_SECRET}`, a value only these routes
 * and the external scheduler's (cron-job.org) saved header know. None of
 * these routes follow AGENTS.md's "every route starts with
 * `getWorkspaceSession()`" rule — there is no WorkOS session for a
 * system-to-system cron invocation — and none are listed in `src/proxy.ts`'s
 * matcher, since that middleware exists to attach a WorkOS session.
 */
export function isVerifiedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

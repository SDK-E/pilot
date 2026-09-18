/**
 * Global stale-run sweep, triggered daily by Vercel Cron (see the `crons`
 * entry in vercel.json). `reapStaleExecutions`/`reapStaleWorkRuns`
 * (src/executions/execution-repository.ts, src/work/work-run-repository.ts)
 * only close a stale `running` execution/work_run when that same
 * conversation happens to start its next turn, scoped to that one
 * conversation. A conversation abandoned after a crash and never revisited
 * would otherwise stay `running` forever. This route calls the global,
 * unscoped counterparts (`reapAllStaleExecutions`/`reapAllStaleWorkRuns`)
 * across every organization instead of waiting on that opportunistic path.
 *
 * This is NOT a user-facing route, so it deliberately does not follow
 * AGENTS.md's "every page/Server Action/API route starts with
 * `getWorkspaceSession()`" rule — there is no WorkOS session to check for a
 * system-to-system cron invocation. It is not listed in `src/proxy.ts`'s
 * matcher either, for the same reason: that middleware exists to attach a
 * WorkOS session, which this request never has. Instead it authenticates
 * the standard Vercel Cron way, verifying the request carries
 * `Authorization: Bearer ${CRON_SECRET}` (see
 * https://vercel.com/docs/cron-jobs/manage-cron-jobs, "Securing cron jobs")
 * — Vercel attaches this header automatically to its own cron invocations;
 * any request without the matching secret is rejected.
 */
export const runtime = "nodejs";

function isVerifiedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isVerifiedCronRequest(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { reapAllStaleExecutions } =
    await import("@/executions/execution-repository");
  const { reapAllStaleWorkRuns } = await import("@/work/work-run-repository");

  const reapedExecutions = await reapAllStaleExecutions();
  await reapAllStaleWorkRuns();

  return Response.json({ reapedExecutions });
}

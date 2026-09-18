/**
 * Global stale-run sweep, triggered by an external HTTP cron scheduler
 * (e.g. cron-job.org — free, unlimited jobs, down to 1-minute intervals;
 * chosen over Vercel Cron because this project's Vercel plan caps cron jobs
 * at once per day). `reapStaleExecutions`/`reapStaleWorkRuns`
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
 * WorkOS session, which this request never has. Instead it authenticates by
 * requiring the request to carry `Authorization: Bearer ${CRON_SECRET}`,
 * a value only this route and the external scheduler's saved header know;
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

import { isVerifiedCronRequest } from "@/lib/cron-auth";

/**
 * Global stale-run sweep, triggered by an external HTTP cron scheduler
 * (e.g. cron-job.org — free, unlimited jobs, down to 1-minute intervals;
 * chosen over Vercel Cron because this project's Vercel plan caps cron jobs
 * at once per day). `reapStaleExecutions`/`reapStaleAgentRuns`
 * (src/executions/execution-repository.ts,
 * src/executions/agent-run-repository.ts) only close a stale `running`
 * execution/agent_run when that same conversation happens to start its next
 * turn, scoped to that one conversation. A conversation abandoned after a
 * crash and never revisited would otherwise stay `running` forever. This
 * route calls the global, unscoped counterparts
 * (`reapAllStaleExecutions`/`reapAllStaleAgentRuns`) across every
 * organization instead of waiting on that opportunistic path. See
 * `isVerifiedCronRequest` for this route's authentication.
 */
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isVerifiedCronRequest(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { reapAllStaleExecutions } =
    await import("@/executions/execution-repository");
  const { reapAllStaleAgentRuns } =
    await import("@/executions/agent-run-repository");

  const reapedExecutions = await reapAllStaleExecutions();
  await reapAllStaleAgentRuns();

  return Response.json({ reapedExecutions });
}

import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

// TEMPORARY bisection: return right after session resolution, before any DB
// calls or streamMessage, to isolate whether getWorkspaceSession() itself is
// the crash point.
export async function POST() {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);
  return Response.json({
    sessionOk: true,
    organizationId: session.organizationId,
  });
}

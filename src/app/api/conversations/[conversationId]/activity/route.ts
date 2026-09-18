import { z } from "zod";

import { getActiveAgentRun } from "@/executions/agent-run-repository";
import { listConversationActivity } from "@/executions/execution-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ conversationId: string }>;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);

  const { conversationId: rawConversationId } = await params;
  const conversationId = z.uuid().safeParse(rawConversationId);
  if (!conversationId.success) {
    return Response.json({ error: "Conversation not found." }, { status: 404 });
  }
  const [activities, workRun] = await Promise.all([
    listConversationActivity(
      session.organizationId,
      conversationId.data,
      session.user.id,
    ),
    getActiveAgentRun(
      session.organizationId,
      conversationId.data,
      session.user.id,
    ),
  ]);
  return Response.json(
    { activities, workRun: workRun ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}

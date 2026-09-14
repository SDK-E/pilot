import { z } from "zod";

import { AGENT_KIND_IDS, modeHref } from "@/agents/agent-kinds";
import { startConversation } from "@/conversations/start-conversation";
import { readJsonBody } from "@/lib/http";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureResponse,
} from "@/organizations/workspace-session";

export const runtime = "nodejs";

const inputSchema = z.object({
  kind: z.enum(AGENT_KIND_IDS),
  prompt: z.string().trim().min(1).max(10_000),
  agentId: z.uuid().optional(),
});

/**
 * Creates a conversation for a first message. The browser then opens it and
 * streams that message through the conversation's stream route.
 */
export async function POST(request: Request) {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return sessionFailureResponse(session);

  const input = inputSchema.safeParse(await readJsonBody(request));
  if (!input.success) {
    return Response.json({ error: "A message is required." }, { status: 400 });
  }
  const prepared = await startConversation({
    context: {
      organization: {
        id: session.organizationId,
        name: session.membership.organizationName,
      },
      member: {
        id: session.membership.id,
        roleSlug: session.membership.role.slug,
      },
      user: session.user,
    },
    kind: input.data.kind,
    agentId: input.data.agentId,
    message: input.data.prompt,
  });
  if (!prepared.ok) {
    return Response.json({ error: prepared.message }, { status: 400 });
  }
  return Response.json(
    {
      conversationId: prepared.conversationId,
      href: modeHref(input.data.kind, prepared.conversationId),
    },
    { status: 201 },
  );
}

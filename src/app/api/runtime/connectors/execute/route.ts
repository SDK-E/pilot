import { z } from "zod";

import { isVerifiedPilotRuntimeCallback } from "@/ai/workos-m2m";
import { dispatchCustomConnector } from "@/connectors/dispatch-custom-connector";
import { getRuntimeConversation } from "@/conversations/scratchpad-repository";
import { readJsonBody } from "@/lib/http";

export const runtime = "nodejs";

const inputSchema = z
  .object({
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    toolId: z.string().min(1).max(100),
    action: z.string().min(1).max(100),
    params: z.record(z.string(), z.unknown()),
    connectorSlug: z.string().trim().min(1).max(200).optional(),
    confirm: z.boolean().optional(),
  })
  .strict();

/**
 * Dispatches a connector tool call from Pilot AI's runtime. Ownership is
 * derived strictly from `executionId` via the DB, never trusted from the
 * request body (`organizationId` there is only a consistency hint). Every
 * connector — GitHub, Slack, and any admin-added one — is a row in
 * `connector_definitions`; `dispatch-custom-connector.ts` is the one
 * generic dispatcher for all of them (see
 * docs/decisions/0023-dynamic-connectors.md).
 */
export async function POST(request: Request) {
  if (!(await isVerifiedPilotRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const parsed = inputSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid connector command.", kind: "invalid-input" },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const execution = await getRuntimeConversation({
    organizationId: input.organizationId,
    executionId: input.executionId,
  });
  if (!execution) {
    return Response.json(
      { error: "Execution unavailable.", kind: "not-found" },
      { status: 404 },
    );
  }

  return dispatchCustomConnector({
    organizationId: input.organizationId,
    actingUserId: execution.userId,
    action: input.action,
    params: input.params,
    connectorSlug: input.connectorSlug,
    confirm: input.confirm,
    requestedSlugs: execution.requestedConnectorSlugs ?? null,
  });
}

import { z } from "zod";

import { isVerifiedRuntimeCallback } from "@/ai/pilot-runtime-oidc";
import {
  isSafeSkillId,
  toolActivityToolIds,
} from "@/executions/activity-event";
import { readJsonBody } from "@/lib/http";

export const runtime = "nodejs";

const toolInputSchema = z
  .object({
    // Optional during the rolling deployment from the original tool-only
    // callback contract. New runtime events always send kind: "tool".
    kind: z.literal("tool").optional(),
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    toolId: z.enum(toolActivityToolIds),
    toolCallId: z.string().min(1).max(255).optional(),
    state: z.enum(["started", "completed", "failed", "awaiting_approval"]),
    runtimeRunId: z.string().min(1).max(255).optional(),
  })
  .strict();

const skillInputSchema = z
  .object({
    kind: z.literal("skill"),
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    skillId: z.string().refine(isSafeSkillId, "Invalid runtime skill."),
  })
  .strict();

const inputSchema = z.union([toolInputSchema, skillInputSchema]);

export async function POST(request: Request) {
  if (!(await isVerifiedRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const input = inputSchema.safeParse(await readJsonBody(request));
  if (!input.success) {
    return Response.json({ error: "Invalid activity event." }, { status: 400 });
  }

  const { appendSkillActivity, appendToolActivity } =
    await import("@/executions/execution-repository");
  if (input.data.kind === "skill") {
    await appendSkillActivity(input.data);
    return new Response(null, { status: 204 });
  }
  if (input.data.state === "awaiting_approval") {
    if (!input.data.runtimeRunId || !input.data.toolCallId) {
      return Response.json(
        { error: "Invalid approval event." },
        { status: 400 },
      );
    }
    const { createRuntimeToolApproval } =
      await import("@/approvals/approval-repository");
    if (
      input.data.toolId !== "web-search" &&
      input.data.toolId !== "scratchpad"
    ) {
      return Response.json(
        { error: "Unsupported approval tool." },
        { status: 400 },
      );
    }
    await createRuntimeToolApproval({
      organizationId: input.data.organizationId,
      executionId: input.data.executionId,
      runtimeRunId: input.data.runtimeRunId,
      toolCallId: input.data.toolCallId,
      toolId: input.data.toolId,
    });
  }
  await appendToolActivity(input.data);
  return new Response(null, { status: 204 });
}

import { z } from "zod";

import { isVerifiedPilotRuntimeCallback } from "@/ai/workos-m2m";
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
    state: z.enum(["started", "completed", "failed"]),
    runtimeRunId: z.string().min(1).max(255).optional(),
    detail: z.string().max(4000).optional(),
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
  if (!(await isVerifiedPilotRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const input = inputSchema.safeParse(await readJsonBody(request));
  if (!input.success) {
    return Response.json({ error: "Invalid activity event." }, { status: 400 });
  }

  const { appendSkillActivity, appendToolActivity } =
    await import("@/executions/execution-repository");
  const { recordWorkRunStep } = await import("@/work/work-run-repository");
  // A no-op for Chat/Code executions, which never have a `work_runs` row.
  await recordWorkRunStep({
    organizationId: input.data.organizationId,
    executionId: input.data.executionId,
  });
  if (input.data.kind === "skill") {
    await appendSkillActivity(input.data);
    return new Response(null, { status: 204 });
  }
  await appendToolActivity(input.data);
  return new Response(null, { status: 204 });
}

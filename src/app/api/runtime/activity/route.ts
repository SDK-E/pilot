import { z } from "zod";
import { verifyPilotRuntimeCallback } from "@/ai/pilot-runtime-oidc";
import { toolActivityToolIds } from "@/executions/activity-event";

export const runtime = "nodejs";

const inputSchema = z
  .object({
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    toolId: z.enum(toolActivityToolIds),
    toolCallId: z.string().min(1).max(255).optional(),
    state: z.enum(["started", "completed", "failed", "awaiting_approval"]),
    runtimeRunId: z.string().min(1).max(255).optional(),
  })
  .strict();

export async function POST(request: Request) {
  if (!(await verifyPilotRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => undefined);
  const input = inputSchema.safeParse(body);
  if (!input.success) {
    return Response.json({ error: "Invalid activity event." }, { status: 400 });
  }

  const { appendToolActivity } =
    await import("@/executions/execution-repository");
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

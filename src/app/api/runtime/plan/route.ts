import { z } from "zod";

import { isVerifiedPilotRuntimeCallback } from "@/ai/workos-m2m";
import { readJsonBody } from "@/lib/http";

export const runtime = "nodejs";

const stepSchema = z
  .object({
    id: z.string().trim().min(1).max(100),
    text: z.string().trim().min(1).max(300),
    status: z.enum(["pending", "in_progress", "done"]),
  })
  .strict();

const inputSchema = z
  .object({
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    action: z.enum(["read", "write"]),
    steps: z.array(stepSchema).max(20).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.action === "write" && input.steps === undefined) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message: "A plan write requires steps.",
      });
    }
  });

export async function POST(request: Request) {
  if (!(await isVerifiedPilotRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const input = inputSchema.safeParse(await readJsonBody(request));
  if (!input.success) {
    return Response.json({ error: "Invalid plan command." }, { status: 400 });
  }

  const repository = await import("@/conversations/plan-repository");
  const plan =
    input.data.action === "read"
      ? await repository.readRuntimeConversationPlan(input.data)
      : await repository.writeRuntimeConversationPlan({
          ...input.data,
          steps: input.data.steps ?? [],
        });
  if (!plan) {
    return Response.json(
      { error: "Conversation unavailable." },
      { status: 404 },
    );
  }
  return Response.json({ steps: plan.steps });
}

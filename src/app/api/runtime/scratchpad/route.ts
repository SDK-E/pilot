import { z } from "zod";
import { verifyPilotRuntimeCallback } from "@/ai/pilot-runtime-oidc";

export const runtime = "nodejs";

const inputSchema = z
  .object({
    organizationId: z.string().min(1).max(255),
    executionId: z.uuid(),
    action: z.enum(["read", "write"]),
    content: z.string().max(16_000).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.action === "write" && input.content === undefined) {
      context.addIssue({
        code: "custom",
        path: ["content"],
        message: "A scratchpad write requires content.",
      });
    }
  });

export async function POST(request: Request) {
  if (!(await verifyPilotRuntimeCallback(request))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  const input = inputSchema.safeParse(
    await request.json().catch(() => undefined),
  );
  if (!input.success) {
    return Response.json(
      { error: "Invalid scratchpad command." },
      { status: 400 },
    );
  }

  const repository = await import("@/conversations/scratchpad-repository");
  const scratchpad =
    input.data.action === "read"
      ? await repository.readRuntimeConversationScratchpad(input.data)
      : await repository.writeRuntimeConversationScratchpad({
          ...input.data,
          content: input.data.content ?? "",
        });
  if (!scratchpad) {
    return Response.json(
      { error: "Conversation unavailable." },
      { status: 404 },
    );
  }
  return Response.json({ content: scratchpad.content });
}

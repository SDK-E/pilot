"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  approvalModes,
  baseAgentIds,
  configurableToolIds,
} from "@/agents/agent-configuration";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import type { WorkerCreationState } from "@/workers/worker-creation-state";
import { createWorker } from "@/workers/worker-repository";

const workerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  instructions: z
    .string()
    .trim()
    .min(1, "Instructions are required.")
    .max(10_000),
  modelId: z.literal("kilo/kilo-auto/free"),
  baseAgentId: z.enum(baseAgentIds),
  goals: z.string().trim().max(5_000).optional(),
  tone: z.string().trim().max(200).optional(),
  outputFormat: z.string().trim().max(1_000).optional(),
  enabledToolIds: z.array(z.enum(configurableToolIds)).default([]),
  approvalMode: z.enum(approvalModes),
});

export async function createWorkerAction(
  _previousState: WorkerCreationState,
  formData: FormData,
): Promise<WorkerCreationState> {
  const parsed = workerInputSchema.safeParse({
    name: formData.get("name"),
    instructions: formData.get("instructions"),
    modelId: formData.get("modelId"),
    baseAgentId: formData.get("baseAgentId"),
    goals: formData.get("goals") || undefined,
    tone: formData.get("tone") || undefined,
    outputFormat: formData.get("outputFormat") || undefined,
    enabledToolIds: formData.getAll("enabledToolIds"),
    approvalMode: formData.get("approvalMode"),
  });
  if (!parsed.success) {
    return { message: parsed.error.issues[0]?.message, status: "error" };
  }

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return {
      message: "Choose an organization before creating a worker.",
      status: "error",
    };
  }

  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) {
    return {
      message: "Your organization access is no longer active.",
      status: "error",
    };
  }

  try {
    const worker = await createWorker({
      organization: {
        id: organizationId,
        name: membership.organizationName,
      },
      member: { id: membership.id, roleSlug: membership.role.slug },
      user: { id: user.id, email: user.email },
      worker: {
        ...parsed.data,
        approvalRules: Object.fromEntries(
          parsed.data.enabledToolIds.map((toolId) => [
            toolId,
            parsed.data.approvalMode,
          ]),
        ),
        knowledgeSourceIds: [],
      },
    });
    revalidatePath("/workspace");
    return {
      message: `${worker.name} is ready to configure.`,
      status: "success",
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        message: "A worker with that name already exists in this organization.",
        status: "error",
      };
    }
    throw error;
  }
}

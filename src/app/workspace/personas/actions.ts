"use server";

import { withAuth } from "@workos-inc/authkit-nextjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  approvalModes,
  baseAgentIds,
  configurableToolIds,
} from "@/agents/agent-configuration";
import { listConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { nextDuplicatePersonaName } from "@/workers/duplicate-persona-name";
import {
  createWorker,
  deleteWorker,
  getWorker,
  listWorkers,
} from "@/workers/worker-repository";

export type DeletePersonaState = {
  message?: string;
  status: "idle" | "error" | "success";
};

export type DuplicatePersonaState = {
  href?: string;
  message?: string;
  status: "idle" | "error" | "success";
};

const storedPersonaConfigurationSchema = z.object({
  baseAgentId: z.enum(baseAgentIds),
  enabledToolIds: z.array(z.enum(configurableToolIds)),
  knowledgeSourceIds: z.array(z.string()),
  approvalRules: z.record(z.string(), z.enum(approvalModes)),
});

export async function duplicatePersonaAction(
  _previousState: DuplicatePersonaState,
  formData: FormData,
): Promise<DuplicatePersonaState> {
  const id = z.uuid().safeParse(formData.get("workerId"));
  if (!id.success)
    return { status: "error", message: "This persona is unavailable." };

  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return { status: "error", message: "Choose an organization first." };
  }
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) {
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };
  }

  const source = await getWorker(organizationId, id.data);
  const configuration = source
    ? storedPersonaConfigurationSchema.safeParse(source)
    : undefined;
  if (!source || !configuration?.success) {
    return { status: "error", message: "This persona is unavailable." };
  }

  const name = nextDuplicatePersonaName(
    source.name,
    new Set((await listWorkers(organizationId)).map((worker) => worker.name)),
  );
  if (!name) {
    return {
      status: "error",
      message: "Rename an existing copy before creating another one.",
    };
  }

  try {
    const duplicated = await createWorker({
      organization: { id: organizationId, name: membership.organizationName },
      member: {
        id: membership.id,
        roleSlug: membership.role?.slug ?? "member",
      },
      user: user,
      worker: {
        name,
        instructions: source.instructions,
        modelId: source.modelId,
        goals: source.goals,
        tone: source.tone,
        outputFormat: source.outputFormat,
        ...configuration.data,
      },
    });
    revalidatePath("/workspace");
    revalidatePath("/workspace/personas");
    revalidatePath("/workspace/fleet");
    return {
      status: "success",
      href: `/workspace/personas/${duplicated.id}`,
      message: `${duplicated.name} is ready to edit.`,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return {
        status: "error",
        message: "Someone created that copy first. Try again.",
      };
    }
    throw error;
  }
}

export async function deletePersonaAction(
  _previousState: DeletePersonaState,
  formData: FormData,
): Promise<DeletePersonaState> {
  const id = z.uuid().safeParse(formData.get("workerId"));
  if (!id.success) {
    return { status: "error", message: "This persona is unavailable." };
  }
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    return { status: "error", message: "Choose an organization first." };
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    return {
      status: "error",
      message: "Your organization access is no longer active.",
    };
  }

  try {
    const source = await getWorker(organizationId, id.data);
    if (!source) {
      return { status: "error", message: "This persona is unavailable." };
    }
    const archived = await deleteWorker(organizationId, id.data);
    if (!archived) {
      return { status: "error", message: "This persona is unavailable." };
    }
  } catch {
    return {
      status: "error",
      message: "Pilot could not archive this persona. Try again.",
    };
  }

  revalidatePath("/workspace");
  revalidatePath("/workspace/personas");
  revalidatePath("/workspace/fleet");
  return { status: "success", message: "Persona archived." };
}

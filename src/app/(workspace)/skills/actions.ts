"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { TOOL_IDS } from "@/agents/agent-kinds";
import { optionalText } from "@/lib/form-data";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureMessage,
} from "@/organizations/workspace-session";
import {
  archiveSkill,
  createSkill,
  updateSkill,
  type SkillConfiguration,
} from "@/skills/skill-repository";

import type { SkillFormState } from "@/skills/skill-form-state";

const error = (message: string): SkillFormState => ({
  status: "error",
  message,
});

const skillFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  description: z.string().trim().max(300).optional(),
  // Must stay >= skill-markdown.ts's MAX_INSTRUCTIONS_LENGTH (8000) — a
  // marketplace-installed skill's instructions can be that long, and this
  // form re-validates the full value on every save, including an
  // unmodified re-save.
  instructions: z.string().trim().max(8000).optional(),
  toolIds: z.array(z.enum(TOOL_IDS)),
});

function skillFromForm(
  formData: FormData,
): { skill: SkillConfiguration } | { error: string } {
  const parsed = skillFormSchema.safeParse({
    name: formData.get("name"),
    description: optionalText(formData, "description"),
    instructions: optionalText(formData, "instructions"),
    toolIds: formData.getAll("toolIds"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the skill details.",
    };
  }
  return {
    skill: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      instructions: parsed.data.instructions ?? "",
      toolIds: parsed.data.toolIds,
    },
  };
}

function isDuplicateName(cause: unknown) {
  return (
    typeof cause === "object" &&
    cause !== null &&
    "code" in cause &&
    cause.code === "23505"
  );
}

export async function createSkillAction(
  _previous: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const form = skillFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const created = await createSkill(
      session.organizationId,
      session.user.id,
      form.skill,
    );
    if (!created) return error("This skill could not be saved.");
    revalidatePath("/", "layout");
    return {
      status: "success",
      message: `${created.name} is ready.`,
      href: `/skills/${created.id}`,
    };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "A skill with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function updateSkillAction(
  _previous: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const skillId = z.uuid().safeParse(formData.get("skillId"));
  if (!skillId.success) return error("This skill is unavailable.");
  const form = skillFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const updated = await updateSkill(
      session.organizationId,
      skillId.data,
      form.skill,
    );
    if (!updated) return error("This skill is unavailable.");
    revalidatePath("/", "layout");
    return { status: "success", message: `${updated.name} was updated.` };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "A skill with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function deleteSkillAction(
  _previous: SkillFormState,
  formData: FormData,
): Promise<SkillFormState> {
  const skillId = z.uuid().safeParse(formData.get("skillId"));
  if (!skillId.success) return error("This skill is unavailable.");
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  const archived = await archiveSkill(session.organizationId, skillId.data);
  if (!archived) return error("This skill is unavailable.");
  revalidatePath("/", "layout");
  redirect("/skills");
}

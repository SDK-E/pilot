"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  archiveCommand,
  createCommand,
  updateCommand,
  type CommandConfiguration,
} from "@/commands/command-repository";
import { optionalText } from "@/lib/form-data";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureMessage,
} from "@/organizations/workspace-session";

import type { CommandFormState } from "@/commands/command-form-state";

const error = (message: string): CommandFormState => ({
  status: "error",
  message,
});

const commandFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  description: z.string().trim().max(300).optional(),
  promptTemplate: z
    .string()
    .trim()
    .min(1, "A prompt template is required.")
    .max(4000),
});

function commandFromForm(
  formData: FormData,
): { command: CommandConfiguration } | { error: string } {
  const parsed = commandFormSchema.safeParse({
    name: formData.get("name"),
    description: optionalText(formData, "description"),
    promptTemplate: formData.get("promptTemplate"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the command details.",
    };
  }
  return {
    command: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      promptTemplate: parsed.data.promptTemplate,
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

export async function createCommandAction(
  _previous: CommandFormState,
  formData: FormData,
): Promise<CommandFormState> {
  const form = commandFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const created = await createCommand(
      session.organizationId,
      session.user.id,
      form.command,
    );
    if (!created) return error("This command could not be saved.");
    revalidatePath("/", "layout");
    return {
      status: "success",
      message: `${created.name} is ready.`,
      href: `/commands/${created.id}`,
    };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "A command with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function updateCommandAction(
  _previous: CommandFormState,
  formData: FormData,
): Promise<CommandFormState> {
  const commandId = z.uuid().safeParse(formData.get("commandId"));
  if (!commandId.success) return error("This command is unavailable.");
  const form = commandFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const updated = await updateCommand(
      session.organizationId,
      commandId.data,
      form.command,
    );
    if (!updated) return error("This command is unavailable.");
    revalidatePath("/", "layout");
    return { status: "success", message: `${updated.name} was updated.` };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "A command with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function deleteCommandAction(
  _previous: CommandFormState,
  formData: FormData,
): Promise<CommandFormState> {
  const commandId = z.uuid().safeParse(formData.get("commandId"));
  if (!commandId.success) return error("This command is unavailable.");
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  const archived = await archiveCommand(session.organizationId, commandId.data);
  if (!archived) return error("This command is unavailable.");
  revalidatePath("/", "layout");
  redirect("/commands");
}

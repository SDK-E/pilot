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
  archivePlugin,
  createPlugin,
  updatePlugin,
  type PluginConfiguration,
} from "@/plugins/plugin-repository";

import type { PluginFormState } from "@/plugins/plugin-form-state";

const error = (message: string): PluginFormState => ({
  status: "error",
  message,
});

const pluginFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  description: z.string().trim().max(300).optional(),
  commandIds: z.array(z.uuid()),
  toolIds: z.array(z.enum(TOOL_IDS)),
});

function pluginFromForm(
  formData: FormData,
): { plugin: PluginConfiguration } | { error: string } {
  const parsed = pluginFormSchema.safeParse({
    name: formData.get("name"),
    description: optionalText(formData, "description"),
    commandIds: formData.getAll("commandIds"),
    toolIds: formData.getAll("toolIds"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the plugin details.",
    };
  }
  return {
    plugin: {
      name: parsed.data.name,
      description: parsed.data.description ?? "",
      commandIds: parsed.data.commandIds,
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

export async function createPluginAction(
  _previous: PluginFormState,
  formData: FormData,
): Promise<PluginFormState> {
  const form = pluginFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const created = await createPlugin(
      session.organizationId,
      session.user.id,
      form.plugin,
    );
    if (!created) return error("This plugin could not be saved.");
    revalidatePath("/", "layout");
    return {
      status: "success",
      message: `${created.name} is ready.`,
      href: `/plugins/${created.id}`,
    };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "A plugin with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function updatePluginAction(
  _previous: PluginFormState,
  formData: FormData,
): Promise<PluginFormState> {
  const pluginId = z.uuid().safeParse(formData.get("pluginId"));
  if (!pluginId.success) return error("This plugin is unavailable.");
  const form = pluginFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const updated = await updatePlugin(
      session.organizationId,
      pluginId.data,
      form.plugin,
    );
    if (!updated) return error("This plugin is unavailable.");
    revalidatePath("/", "layout");
    return { status: "success", message: `${updated.name} was updated.` };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "A plugin with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function deletePluginAction(
  _previous: PluginFormState,
  formData: FormData,
): Promise<PluginFormState> {
  const pluginId = z.uuid().safeParse(formData.get("pluginId"));
  if (!pluginId.success) return error("This plugin is unavailable.");
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  const archived = await archivePlugin(session.organizationId, pluginId.data);
  if (!archived) return error("This plugin is unavailable.");
  revalidatePath("/", "layout");
  redirect("/plugins");
}

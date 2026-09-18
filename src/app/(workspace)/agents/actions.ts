"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AGENT_KIND_IDS, TOOL_IDS } from "@/agents/agent-kinds";
import { nextCopyName } from "@/agents/agent-name";
import {
  archiveAgent,
  createAgent,
  DEFAULT_MODEL_ID,
  getAgent,
  listAgents,
  setAgentSkillEnabled,
  updateAgent,
  type AgentConfiguration,
} from "@/agents/agent-repository";
import { isToolAvailableTo } from "@/agents/agent-tools";
import { optionalText } from "@/lib/form-data";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  sessionFailureMessage,
  type WorkspaceSession,
} from "@/organizations/workspace-session";

import type { AgentFormState } from "@/agents/agent-form-state";

const error = (message: string): AgentFormState => ({
  status: "error",
  message,
});

const agentFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(100),
  baseAgentId: z.enum(AGENT_KIND_IDS),
  instructions: z
    .string()
    .trim()
    .min(1, "Instructions are required.")
    .max(10_000),
  goals: z.string().trim().max(5000).optional(),
  tone: z.string().trim().max(200).optional(),
  outputFormat: z.string().trim().max(1000).optional(),
  enabledToolIds: z.array(z.enum(TOOL_IDS)),
  enabledSkillIds: z.array(z.uuid()),
});

/**
 * Reads the agent form. Enabled tools are kept only for tools the kind
 * allows, so a stale hidden field can never grant a tool.
 */
function agentFromForm(
  formData: FormData,
): { agent: AgentConfiguration } | { error: string } {
  const parsed = agentFormSchema.safeParse({
    name: formData.get("name"),
    baseAgentId: formData.get("baseAgentId"),
    instructions: formData.get("instructions"),
    goals: optionalText(formData, "goals"),
    tone: optionalText(formData, "tone"),
    outputFormat: optionalText(formData, "outputFormat"),
    enabledToolIds: formData.getAll("enabledToolIds"),
    enabledSkillIds: formData.getAll("enabledSkillIds"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Check the agent details.",
    };
  }
  const agent = parsed.data;
  const enabledToolIds = agent.enabledToolIds.filter((toolId) =>
    isToolAvailableTo(toolId, agent.baseAgentId),
  );
  return {
    agent: {
      ...agent,
      modelId: DEFAULT_MODEL_ID,
      enabledToolIds,
    },
  };
}

function organizationContext(session: WorkspaceSession) {
  return {
    organization: {
      id: session.organizationId,
      name: session.membership.organizationName,
    },
    member: {
      id: session.membership.id,
      roleSlug: session.membership.role.slug,
    },
    user: session.user,
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

export async function createAgentAction(
  _previous: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const form = agentFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const created = await createAgent(organizationContext(session), form.agent);
    revalidatePath("/", "layout");
    return {
      status: "success",
      message: `${created.name} is ready.`,
      href: `/agents/${created.id}`,
    };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "An agent with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

export async function updateAgentAction(
  _previous: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const agentId = z.uuid().safeParse(formData.get("agentId"));
  if (!agentId.success) return error("This agent is unavailable.");
  const form = agentFromForm(formData);
  if ("error" in form) return error(form.error);
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  try {
    const updated = await updateAgent(
      session.organizationId,
      agentId.data,
      form.agent,
    );
    if (!updated) return error("This agent is unavailable.");
    revalidatePath("/", "layout");
    return { status: "success", message: `${updated.name} was updated.` };
  } catch (error_) {
    if (isDuplicateName(error_)) {
      return error(
        "An agent with that name already exists in this organization.",
      );
    }
    throw error_;
  }
}

/**
 * Grants or revokes one skill for an agent — the composer's own quick-grant
 * affordance (`SkillPicker`), so a skill the org already has can be turned
 * on for the current agent without leaving the conversation for the full
 * agent edit form. Returns plainly rather than via `AgentFormState`/
 * `revalidatePath`, since it's called directly from a client component, not
 * a `<form action>`, and the composer updates its own local skill list
 * optimistically instead of waiting on a server-driven re-render.
 */
export async function setAgentSkillEnabledAction(
  agentId: string,
  skillId: string,
  shouldGrant: boolean,
): Promise<{ ok: boolean }> {
  const parsedAgentId = z.uuid().safeParse(agentId);
  const parsedSkillId = z.uuid().safeParse(skillId);
  if (!parsedAgentId.success || !parsedSkillId.success) return { ok: false };
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return { ok: false };
  const updated = await setAgentSkillEnabled(
    session.organizationId,
    parsedAgentId.data,
    parsedSkillId.data,
    shouldGrant,
  );
  return { ok: Boolean(updated) };
}

export async function duplicateAgentAction(
  _previous: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const agentId = z.uuid().safeParse(formData.get("agentId"));
  if (!agentId.success) return error("This agent is unavailable.");
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  const source = await getAgent(session.organizationId, agentId.data);
  if (!source || source.archived) return error("This agent is unavailable.");
  const agents = await listAgents(session.organizationId);
  const names = new Set(agents.map((agent) => agent.name));
  const name = nextCopyName(source.name, names);
  if (!name)
    return error("Rename an existing copy before creating another one.");

  const copy = await createAgent(organizationContext(session), {
    name,
    instructions: source.instructions,
    modelId: source.modelId,
    baseAgentId: source.baseAgentId,
    goals: source.goals,
    tone: source.tone,
    outputFormat: source.outputFormat,
    enabledToolIds: source.enabledToolIds,
    enabledSkillIds: source.enabledSkillIds,
  });
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: `${copy.name} is ready to edit.`,
    href: `/agents/${copy.id}`,
  };
}

export async function deleteAgentAction(
  _previous: AgentFormState,
  formData: FormData,
): Promise<AgentFormState> {
  const agentId = z.uuid().safeParse(formData.get("agentId"));
  if (!agentId.success) return error("This agent is unavailable.");
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session))
    return error(sessionFailureMessage(session));

  const archived = await archiveAgent(session.organizationId, agentId.data);
  if (!archived) return error("This agent is unavailable.");
  revalidatePath("/", "layout");
  // Redirecting here (rather than returning a href for the client to
  // navigate to) avoids a race with this same path's own revalidation: once
  // archived, the agent's edit page 404s, and a client-side redirect issued
  // after that render had already lost would leave the visitor stranded.
  redirect("/agents");
}

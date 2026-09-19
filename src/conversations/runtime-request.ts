import "server-only";

import { resolveByokCredential } from "@/byok/byok-repository";
import { buildAttachmentContext } from "@/conversations/attachment-context";
import {
  allowedToolIds,
  type OrganizationCapabilities,
} from "@/conversations/tool-authorization";
import { resolveInstructionLayers } from "@/conversations/turn-instructions";
import { resolveGatewayCredential } from "@/model-gateways/model-gateway-repository";
import {
  grantedPluginIds,
  resolvePluginsToolIds,
} from "@/plugins/agent-plugin-grants";
import { listPlugins } from "@/plugins/plugin-repository";
import { getProjectMemoryContextForConversation } from "@/projects/project-repository";
import {
  grantedSkillIds,
  resolveSkillsInstructions,
  resolveSkillsToolIds,
} from "@/skills/agent-skill-grants";
import { listSkills } from "@/skills/skill-repository";

import type { RuntimeRequest } from "@/ai/pilot-ai-client";
import type { TurnInput } from "@/conversations/turn-shared";

const MAX_INSTRUCTIONS_LENGTH = 20_000;

/**
 * Resolves a `gw:<gatewayId>:<modelId>` or `byok:<credentialId>:<modelId>`
 * value into the Mastra model id plus the credential to call it with. A
 * plain string (neither prefix) passes through unchanged for pilot-ai to
 * resolve from its own environment.
 */
async function resolveWorkerModel(modelId: string, actingUserId: string) {
  if (modelId.startsWith("byok:")) {
    const credential = await resolveByokCredential(modelId, actingUserId);
    if (!credential) {
      throw new Error(
        "This key is no longer available. Check it in Settings → API Keys.",
      );
    }
    return {
      modelId: `openai/${credential.modelId}`,
      apiKey: credential.apiKey,
      baseUrl: credential.baseUrl,
    };
  }
  if (!modelId.startsWith("gw:"))
    return { modelId, apiKey: undefined, baseUrl: undefined };
  const credential = await resolveGatewayCredential(modelId);
  if (!credential) {
    throw new Error(
      "The organization's chosen model is no longer available. Ask a platform admin to check its gateway in /admin/model-gateways.",
    );
  }
  return {
    modelId: `openai/${credential.modelId}`,
    apiKey: credential.apiKey,
    baseUrl: credential.baseUrl,
  };
}

async function resolveInstructions(
  input: TurnInput,
  activeSkillIds: readonly string[],
  organizationSkills: Awaited<ReturnType<typeof listSkills>>,
  projectId: string | undefined,
) {
  const scope = {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    userId: input.userId,
  };
  const [attachmentContext, instructionLayers] = await Promise.all([
    buildAttachmentContext({
      ...scope,
      maximumCharacters:
        MAX_INSTRUCTIONS_LENGTH - input.agent.instructions.length - 2,
    }),
    resolveInstructionLayers(input, projectId),
  ]);
  const skillInstructions = resolveSkillsInstructions(
    activeSkillIds,
    organizationSkills,
  );
  const extraInstructions = [
    attachmentContext,
    skillInstructions,
    ...instructionLayers,
  ]
    .filter(Boolean)
    .join("\n\n");
  return extraInstructions
    ? `${input.agent.instructions}\n\n${extraInstructions}`
    : input.agent.instructions;
}

/**
 * Builds the request pilot-ai actually runs: the agent's instructions
 * extended with attachment context and any active skills' instructions,
 * the tool grant narrowed/extended by the message's connector toggle and
 * skills (see `allowedToolIds`), and the model/gateway credential to use.
 */
/**
 * Resolves everything the turn needs from the database in one pass: the
 * project memory context, the agent's active skills/plugins (server-derived
 * — never trusting the caller's own skillIds as authorization, AGENTS.md),
 * and the model/gateway credential to use.
 */
async function resolveTurnContext(input: TurnInput, modelId: string) {
  const requestedSkillIds = input.activeSkillIds ?? [];
  const [project, organizationSkills, organizationPlugins, model] =
    await Promise.all([
      getProjectMemoryContextForConversation({
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        userId: input.userId,
      }),
      requestedSkillIds.length > 0
        ? listSkills(input.organizationId)
        : Promise.resolve([]),
      input.agent.enabledPluginIds.length > 0
        ? listPlugins(input.organizationId)
        : Promise.resolve([]),
      resolveWorkerModel(modelId, input.userId),
    ]);
  const activeSkillIds = grantedSkillIds(
    input.agent,
    organizationSkills,
  ).filter((skillId) => requestedSkillIds.includes(skillId));
  const activePluginIds = grantedPluginIds(input.agent, organizationPlugins);
  return {
    project,
    organizationSkills,
    organizationPlugins,
    model,
    activeSkillIds,
    activePluginIds,
  };
}

export async function buildRuntimeRequest(
  input: TurnInput,
  executionId: string,
  modelId: string,
  capabilities: OrganizationCapabilities,
): Promise<RuntimeRequest> {
  const {
    project,
    organizationSkills,
    organizationPlugins,
    model,
    activeSkillIds,
    activePluginIds,
  } = await resolveTurnContext(input, modelId);
  const instructions = await resolveInstructions(
    input,
    activeSkillIds,
    organizationSkills,
    project?.id,
  );
  return {
    organizationId: input.organizationId,
    worker: {
      ...input.agent,
      modelId: model.modelId,
      gatewayApiKey: model.apiKey,
      gatewayBaseUrl: model.baseUrl,
      instructions,
    },
    conversationId: input.conversationId,
    message: input.message,
    executionId,
    allowedToolIds: allowedToolIds(input.agent, capabilities, {
      requestedConnectorToolIds: input.requestedConnectorToolIds,
      activeSkillToolIds: resolveSkillsToolIds(
        activeSkillIds,
        organizationSkills,
      ),
      activePluginToolIds: resolvePluginsToolIds(
        activePluginIds,
        organizationPlugins,
      ),
    }),
    project: project && {
      id: project.id,
      instructions: project.instructions ?? undefined,
      sharedMemoryEnabled: project.sharedMemoryEnabled,
    },
  };
}

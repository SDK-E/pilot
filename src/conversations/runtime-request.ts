import "server-only";

import { buildAttachmentContext } from "@/conversations/attachment-context";
import {
  allowedToolIds,
  type OrganizationCapabilities,
} from "@/conversations/tool-authorization";
import { resolveGatewayCredential } from "@/model-gateways/model-gateway-repository";
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
 * Resolves a `gw:<gatewayId>:<modelId>` value into the Mastra model id plus
 * the credential to call it with. A plain string (no `gw:` prefix) passes
 * through unchanged for pilot-ai to resolve from its own environment.
 */
async function resolveWorkerModel(modelId: string) {
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
) {
  const scope = {
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    userId: input.userId,
  };
  const attachmentContext = await buildAttachmentContext({
    ...scope,
    maximumCharacters:
      MAX_INSTRUCTIONS_LENGTH - input.agent.instructions.length - 2,
  });
  const skillInstructions = resolveSkillsInstructions(
    activeSkillIds,
    organizationSkills,
  );
  const extraInstructions = [attachmentContext, skillInstructions]
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
export async function buildRuntimeRequest(
  input: TurnInput,
  executionId: string,
  modelId: string,
  capabilities: OrganizationCapabilities,
): Promise<RuntimeRequest> {
  const requestedSkillIds = input.activeSkillIds ?? [];
  const [project, organizationSkills, model] = await Promise.all([
    getProjectMemoryContextForConversation({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      userId: input.userId,
    }),
    requestedSkillIds.length > 0
      ? listSkills(input.organizationId)
      : Promise.resolve([]),
    resolveWorkerModel(modelId),
  ]);
  // Never trust the caller's own skillIds as authorization (AGENTS.md) — a
  // skill not granted to this agent must never contribute its instructions
  // or tools just because it happens to belong to the same organization.
  const activeSkillIds = grantedSkillIds(
    input.agent,
    organizationSkills,
  ).filter((skillId) => requestedSkillIds.includes(skillId));
  const instructions = await resolveInstructions(
    input,
    activeSkillIds,
    organizationSkills,
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
    }),
    project: project && {
      id: project.id,
      instructions: project.instructions ?? undefined,
      sharedMemoryEnabled: project.sharedMemoryEnabled,
    },
  };
}

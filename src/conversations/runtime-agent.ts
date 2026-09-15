import "server-only";

import { buildAgentInstructions } from "@/agents/agent-instructions";
import { DEFAULT_MODEL_ID, getAgent } from "@/agents/agent-repository";

import type { AgentKindId } from "@/agents/agent-kinds";

/**
 * What the runtime needs to know about the agent for one request. Built on
 * the server from the stored agent; never from the browser.
 */
export interface RuntimeAgent {
  id: string;
  instructions: string;
  modelId: string;
  baseAgentId: AgentKindId;
  enabledToolIds: string[];
}

export async function loadRuntimeAgent(
  organizationId: string,
  agentId: string,
): Promise<RuntimeAgent | undefined> {
  const agent = await getAgent(organizationId, agentId);
  if (agent?.modelId !== DEFAULT_MODEL_ID) return undefined;
  return {
    id: agent.id,
    instructions: buildAgentInstructions(agent),
    modelId: DEFAULT_MODEL_ID,
    baseAgentId: agent.baseAgentId,
    enabledToolIds: agent.enabledToolIds,
  };
}

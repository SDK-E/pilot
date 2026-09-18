import "server-only";

import { buildAgentInstructions } from "@/agents/agent-instructions";
import { getAgent } from "@/agents/agent-repository";
import { getWorkInstructions } from "@/users/user-preference-repository";

import type { AgentKindId } from "@/agents/agent-kinds";

/**
 * What the runtime needs to know about the agent for one request. Built on
 * the server from the stored agent; never from the browser. `modelId`
 * isn't read from here — the organization's model policy (resolved in
 * `runtime-request.ts` against `model_gateways`) decides which model
 * actually runs a turn; every agent shares that policy.
 */
export interface RuntimeAgent {
  id: string;
  instructions: string;
  baseAgentId: AgentKindId;
  enabledToolIds: string[];
}

export async function loadRuntimeAgent(
  organizationId: string,
  agentId: string,
  requestingWorkosUserId: string,
): Promise<RuntimeAgent | undefined> {
  const agent = await getAgent(organizationId, agentId);
  if (!agent) return undefined;
  const standingInstructions =
    agent.baseAgentId === "work"
      ? await getWorkInstructions(requestingWorkosUserId)
      : null;
  return {
    id: agent.id,
    instructions: buildAgentInstructions(agent, standingInstructions),
    baseAgentId: agent.baseAgentId,
    enabledToolIds: agent.enabledToolIds,
  };
}

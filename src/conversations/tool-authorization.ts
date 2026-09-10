import "server-only";

import {
  isToolAvailableToBaseAgent,
  type ConfigurableToolId,
} from "@/agents/agent-configuration";

const productionToolIds = ["web-search", "scratchpad"] as const;
export type ProductionToolId = (typeof productionToolIds)[number];

function isProductionToolId(value: string): value is ProductionToolId {
  return productionToolIds.includes(value as ProductionToolId);
}

export function allowedProductionToolIds(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}): ProductionToolId[] {
  return input.enabledToolIds.filter(
    (toolId): toolId is ProductionToolId =>
      isProductionToolId(toolId) &&
      isToolAvailableToBaseAgent(
        toolId as ConfigurableToolId,
        input.baseAgentId,
      ) &&
      (input.approvalRules[toolId] === "allow" ||
        input.approvalRules[toolId] === "ask"),
  );
}

import { allowedProductionToolIds } from "@/conversations/tool-authorization";

export function canUsePublicWebSearch(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}) {
  return allowedProductionToolIds(input).includes("web-search");
}

export function canUseResearchWebSearch(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}) {
  return (
    input.baseAgentId === "research" &&
    input.enabledToolIds.includes("web-search") &&
    input.approvalRules["web-search"] === "allow"
  );
}

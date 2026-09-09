type ResearchWebSearchAuthorization = "allow" | "ask" | "deny";

function researchWebSearchAuthorization(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}): ResearchWebSearchAuthorization {
  if (
    input.baseAgentId !== "research" ||
    !input.enabledToolIds.includes("web-search")
  )
    return "deny";
  const mode = input.approvalRules["web-search"];
  return mode === "allow" || mode === "ask" ? mode : "deny";
}

export function canUseResearchWebSearch(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}) {
  return researchWebSearchAuthorization(input) !== "deny";
}

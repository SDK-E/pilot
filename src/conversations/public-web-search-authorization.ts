type PublicWebSearchAuthorization = "allow" | "ask" | "deny";

function publicWebSearchAuthorization(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}): PublicWebSearchAuthorization {
  if (!input.enabledToolIds.includes("web-search")) return "deny";

  const mode = input.approvalRules["web-search"];
  return mode === "allow" || mode === "ask" ? mode : "deny";
}

export function canUsePublicWebSearch(input: {
  baseAgentId: "conversational" | "research";
  enabledToolIds: string[];
  approvalRules: Record<string, string>;
}) {
  return publicWebSearchAuthorization(input) !== "deny";
}

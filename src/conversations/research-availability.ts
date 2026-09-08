type BaseAgentId = "conversational" | "research";

export function isResearchAvailable(baseAgentId: BaseAgentId) {
  return (
    baseAgentId !== "research" || process.env.PILOT_RESEARCH_ENABLED === "true"
  );
}

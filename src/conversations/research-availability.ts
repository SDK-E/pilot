export function isResearchAvailable(baseAgentId: string) {
  return (
    baseAgentId !== "research" || process.env.PILOT_RESEARCH_ENABLED === "true"
  );
}

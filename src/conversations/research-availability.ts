export function isResearchAvailable(baseAgentId: string) {
  return (
    baseAgentId !== "research" || process.env.PILOT_RESEARCH_ENABLED === "true"
  );
}

export type ResearchAvailability = "available" | "disabled" | "no-agent";

export function getResearchState(
  agents: Array<{ baseAgentId: string }>,
): ResearchAvailability {
  const hasResearchAgent = agents.some(
    (agent) => agent.baseAgentId === "research",
  );
  if (!hasResearchAgent) return "no-agent";
  return isResearchAvailable("research") ? "available" : "disabled";
}

export function getResearchDisabledTooltip(
  state: ResearchAvailability,
): string {
  if (state === "no-agent") {
    return "No Research agent is configured for this organization.";
  }
  return "Research is not enabled for this environment yet.";
}

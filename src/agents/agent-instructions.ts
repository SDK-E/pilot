import "server-only";

interface AgentConfiguration {
  instructions: string;
  goals: string | null;
  tone: string | null;
  outputFormat: string | null;
}

function section(label: string, value: string | null) {
  const content = value?.trim();
  return content ? `${label}:\n${content}` : undefined;
}

/**
 * Builds the saved agent settings into one server-owned runtime instruction.
 * Every runtime boundary (new chat, follow-up, approval resume) uses this so
 * the browser never supplies instructions.
 */
export function buildAgentInstructions(agent: AgentConfiguration) {
  return [
    section("General instructions", agent.instructions),
    section("Goals", agent.goals),
    section("Tone", agent.tone),
    section("Output format", agent.outputFormat),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

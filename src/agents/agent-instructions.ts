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
 * Every runtime boundary (new chat, follow-up) uses this so the browser never
 * supplies instructions. `standingInstructions` is the requesting user's own
 * per-mode preference (e.g. Work), layered on top of the agent's own
 * settings — still built here, on the server, never accepted from the
 * browser.
 */
export function buildAgentInstructions(
  agent: AgentConfiguration,
  standingInstructions?: string | null,
) {
  return [
    section("General instructions", agent.instructions),
    section("Goals", agent.goals),
    section("Tone", agent.tone),
    section("Output format", agent.outputFormat),
    section(
      "Your standing instructions from this user",
      standingInstructions ?? null,
    ),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

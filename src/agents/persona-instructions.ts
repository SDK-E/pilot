import "server-only";

type PersonaConfiguration = {
  instructions: string;
  goals: string | null;
  tone: string | null;
  outputFormat: string | null;
};

function section(label: string, value: string | null) {
  const content = value?.trim();
  return content ? `${label}:\n${content}` : undefined;
}

/** Builds the saved persona settings into one server-owned runtime instruction. */
export function buildPersonaInstructions(persona: PersonaConfiguration) {
  return [
    section("General instructions", persona.instructions),
    section("Goals", persona.goals),
    section("Tone", persona.tone),
    section("Output format", persona.outputFormat),
  ]
    .filter((value): value is string => Boolean(value))
    .join("\n\n");
}

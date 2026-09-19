import "server-only";

import { getConversationInstructions } from "@/conversations/conversation-repository";
import { resolveMemoryContext } from "@/memory/memory-repository";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { getGeneralInstructions } from "@/users/user-preference-repository";

import type { TurnInput } from "@/conversations/turn-shared";

const MEMORY_LABELS = {
  organization: "Organization memory",
  user: "Your memory",
  project: "Project memory",
  conversation: "Conversation memory",
} as const;

function formatMemoryContext(
  notes: { scope: keyof typeof MEMORY_LABELS; content: string }[],
): string | undefined {
  if (notes.length === 0) return undefined;
  const byLabel = notes
    .map((note) => `${MEMORY_LABELS[note.scope]}: ${note.content}`)
    .join("\n");
  return `Remembered notes (from Settings, never from this conversation's own text):\n${byLabel}`;
}

/**
 * The instruction layers that sit above the agent's own settings and any
 * active skill: an organization's standing instructions (broadest), a
 * member's own general instructions, that member's remembered notes at
 * every applicable scope, and this specific conversation's own
 * instructions (narrowest) — see docs/decisions/0032-layered-memory-and-instructions.md.
 */
export async function resolveInstructionLayers(
  input: TurnInput,
  projectId: string | undefined,
): Promise<string[]> {
  const [
    organizationPreferences,
    generalInstructions,
    conversationInstructions,
    memoryNotes,
  ] = await Promise.all([
    getOrganizationPreferences(input.organizationId),
    getGeneralInstructions(input.userId),
    getConversationInstructions(
      { organizationId: input.organizationId, userId: input.userId },
      input.conversationId,
    ),
    resolveMemoryContext({
      organizationId: input.organizationId,
      userId: input.userId,
      conversationId: input.conversationId,
      projectId,
    }),
  ]);

  return [
    organizationPreferences.standingInstructions?.trim()
      ? `Organization instructions:\n${organizationPreferences.standingInstructions.trim()}`
      : undefined,
    generalInstructions?.trim()
      ? `Your standing instructions from this user:\n${generalInstructions.trim()}`
      : undefined,
    formatMemoryContext(memoryNotes),
    conversationInstructions?.trim()
      ? `This conversation's own instructions:\n${conversationInstructions.trim()}`
      : undefined,
  ].filter((value): value is string => Boolean(value));
}

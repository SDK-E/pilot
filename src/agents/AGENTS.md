# AGENTS.md — Agents domain

## Purpose

Defines the three agent kinds Pilot offers and the tools an agent may be
granted. See root `AGENTS.md` §Product model and
[ADR-0016](../../docs/decisions/0016-three-agent-kinds.md) before changing
anything here.

## Key files

- `agent-kinds.ts` — `AGENT_KIND_IDS` (`chat` | `work` | `code`), `TOOL_IDS`,
  and `AGENT_KINDS`: each kind's name, tagline, placeholder, suggestions,
  default agent instructions, and allowed tools.
- `agent-tools.ts` — `TOOLS` (id/name/description per tool),
  `isToolAvailableTo`, and `grantedToolIds`, which intersects an agent's
  enabled tools with what its kind allows.
- `agent-repository.ts`, `agent-form-state.ts`, `agent-instructions.ts`,
  `agent-name.ts` — persistence, form validation, and instruction assembly
  for organization-scoped custom agents.

## Rules

- The three kinds are defined once, here. Do not add a fourth kind or a new
  tool without giving it the same authorization, activity, and storage
  behavior as the existing ones (root AGENTS.md §Product model).
- `AGENT_KINDS` is the single source for a kind's default agent and tool
  allowlist — do not hardcode kind-specific copy or tool lists elsewhere.
- Agent instructions sent to the runtime are always built server-side by
  `buildAgentInstructions`; never accept an instruction packet from the
  browser (root AGENTS.md §Security rules).

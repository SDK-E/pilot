# Layered memory, instructions, and personal knowledge base

Status: implemented on 2026-09-19.

## Decision

Four new, explicit context tiers were added, from broadest to narrowest:
organization, member (user), project, and conversation. Two kinds of context
exist at each tier — **instructions** (a standing directive) and **memory**
(a list of short remembered facts) — plus a personal, account-level
**knowledge base** (files) that sits alongside the already-existing
project-level and conversation-level ones.

This is explicit, member-authored context, not automatic conversation
mining. A "memory" here is a short fact a member deliberately writes down
(`memories` table, one row per note), never text an agent extracts from a
conversation on its own. That keeps this feature auditable, revocable, and
free of a background summarization pipeline this pass didn't build. It is
also distinct from pilot-ai's own semantic conversation memory (embeddings
recall, gated by `projects.sharedMemoryEnabled`) — this feature never
touches that mechanism.

## What existed already

Project-level instructions (`projects.instructions`) and a project-level
knowledge base (`project_files`) already existed, as did a conversation-level
knowledge base (`conversation_attachments`) and a per-user, Work-only
instructions field (`userPreferences.workInstructions`). This pass filled
the remaining cells in that grid rather than rebuilding what was already
there.

| Tier         | Instructions                                                                               | Memory                                  | Knowledge base                        |
| ------------ | ------------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------- |
| Organization | `organizationPreferences.standingInstructions` (new)                                       | `memories` scope `"organization"` (new) | — (not requested)                     |
| Member       | `userPreferences.generalInstructions` (new, reaches every kind, unlike `workInstructions`) | `memories` scope `"user"` (new)         | `user_files` (new)                    |
| Project      | `projects.instructions` (existing)                                                         | `memories` scope `"project"` (new)      | `project_files` (existing)            |
| Conversation | `conversations.instructions` (new)                                                         | `memories` scope `"conversation"` (new) | `conversation_attachments` (existing) |

## Resolution order

`src/conversations/turn-instructions.ts`'s `resolveInstructionLayers` reads
all four instruction fields and every applicable memory note for one turn
in a single `Promise.all`, then renders them broadest-first: organization,
member, memory notes, conversation. This joins onto the agent's own
instructions and skill instructions in `runtime-request.ts`'s
`resolveInstructions`, the same place attachment context and skill
instructions were already assembled — no new assembly point was introduced.

`resolveMemoryContext` (`src/memory/memory-repository.ts`) is the one query
that gathers every scope's notes for a turn; it always filters by the
acting member's own `createdByWorkosUserId` except for `"organization"`
scope, so a member never sees another member's personal or project notes
even if they share an organization or a project note happens to reference a
project they don't own.

## Settings and UI surface

- Settings → "Memory & Instructions": a member's own general instructions,
  personal memory, and personal files; an admin additionally sees the
  organization's standing instructions and organization memory.
- A project's own page gained a "Project memory" section next to its
  existing instructions field and file list.
- A conversation's "..." menu gained "Memory & instructions", a dialog for
  that one conversation's own instructions and memory notes, fetched from a
  small dedicated route (`/api/conversations/[conversationId]/memory`)
  rather than threading two more props down `ConversationShell`'s already
  multi-level prop chain.

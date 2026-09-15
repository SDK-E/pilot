# Message edit and regenerate

Status: implemented on 2026-09-15. First item shipped from the chat-baseline
roadmap (`docs/roadmap-chat-baseline.md`).

## Decision

A sent user message can be edited and resent; the last assistant reply can
be regenerated. Both are "forget and resend" operations, not in-place
mutation: editing discards the target message and everything sent after it,
then resends the edited text as an ordinary new turn; regenerating discards
only the last assistant reply, then resends the untouched preceding user
message without creating a duplicate. Regenerate is offered only on the
conversation's last message — Claude Code's transcript-style branch history
is out of scope here; this is "redo the last thing," not multi-branch
history.

## Mechanism

Both flows go through the conversation's existing `/api/conversations/
[conversationId]/stream` route, now a `mode: "send" | "edit" | "regenerate"`
discriminated body instead of a bare prompt (`stream/route.ts`). Before
resending, the route calls `forgetMessagesFrom` (`conversation-mutations.ts`),
which does two things for a given cutoff timestamp:

1. Calls pilot-ai's new `POST /v1/conversations/truncate` endpoint, which
   recalls every message Mastra's own memory holds for that conversation
   thread at or after the cutoff (`Memory.recall` with a `dateRange` filter)
   and deletes them (`Memory.deleteMessages`). Without this, the model would
   still see the pre-edit text or the stale reply on the next turn — Pilot's
   Postgres history is not the only copy of the conversation the runtime
   consults; Mastra keeps its own server-side memory per thread ([ADR-0004](0004-mastra-conversation-runtime-contract.md)).
2. Deletes the matching `conversation_messages` rows in Postgres
   (`deleteMessagesFrom`), cascading their activity events and sources.

`executions` rows for a discarded turn are not separately deleted — they are
left as harmless orphaned history, the same append-only treatment activity
records already get ([ADR-0006](0006-execution-activity-records.md)). Only
`conversationId + createdAt` bounds the delete; nothing here reaches across
organizations or other members' conversations.

Both mutations are refused with `409` while an execution is still `running`
for that conversation (`hasRunningExecution`), so an edit or regenerate can
never race a reply that is still being written. `isLastMessage` — used to
gate regenerate to the newest message — compares with `gte` and excludes the
target by id rather than `gt` on timestamp alone: Postgres stores `createdAt`
at microsecond precision but the Node driver round-trips it through a JS
`Date` at millisecond precision, so a strict `gt` self-comparison can see a
message as "after itself" once truncated. This was caught by
`tests/conversation-mutations.integration.test.ts` before it shipped.

## Consequences

- Regenerating or editing discards conversation history permanently (no undo,
  no branch to switch back to) — consistent with this being a v1 of the
  feature, not a claim that Pilot retains every edit.
- The runtime truncate call happens before the Postgres delete: if pilot-ai
  is unreachable, nothing is destroyed and the request fails like any other
  turn-start failure, rather than leaving Postgres and Mastra's memory out of
  sync.
- This does not add message versioning, edit history, or a "(edited)" label —
  out of scope for this pass, and not required by the roadmap item.

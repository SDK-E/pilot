# Real stop-and-resume

Status: implemented on 2026-09-15. Second item shipped from the chat-baseline
roadmap (`docs/roadmap-chat-baseline.md`), after
[ADR-0019](0019-message-edit-and-regenerate.md).

## Decision

Stopping a response now keeps whatever text had already streamed, instead of
discarding it for a generic "Generation was stopped." placeholder. That
partial reply is marked `isPartial` and, while it remains the conversation's
last message, offers a Continue action that resumes generation and appends
the result onto the same message — not a new bubble. Stop also now forwards
the request's own abort signal into pilot-ai's `agent.stream()` call
(`abortSignal` on `AgentExecutionOptionsBase`), so a stop has a real chance
of halting the underlying model call server-side, not just Pilot giving up
on reading the response.

## Mechanism

- **Server-side abort**: `chat-completions.ts` passes its incoming
  `Request.signal` through `runtime.stream()`/`runtime.generate()` into
  `generationOptions()`'s new `abortSignal` field. Previously this signal
  was read nowhere in pilot-ai — an aborted client fetch tore down Pilot's
  outbound connection, but nothing told Mastra's agent loop to stop.
- **Keeping the partial text**: `streamAttempt` (`conversation-turn.ts`) now
  wraps its `for await` loop in a try/catch; any failure — an abort or a
  genuine error — rethrows a `StreamAttemptError` (`conversation-turn-failure.ts`)
  carrying the text accumulated so far. `failTurn` uses it: a user-initiated
  stop (`clientSignal.aborted`) with non-empty partial text persists that
  text as a normal worker-role reply with `isPartial: true`, instead of the
  old placeholder. An actual runtime failure (not a stop) is unchanged —
  still the generic error placeholder with `isError: true`.
- **Continuing**: the stream route's `mode` gains `"continue"`. It requires
  the target message to be `role: "worker"`, `isPartial: true`, and the
  conversation's last message (reusing `isLastMessage` from ADR-0019).
  Unlike edit and regenerate, continue forgets nothing — Postgres and the
  runtime's memory are both left alone. It resends the untouched preceding
  user message (via `reuseUserMessageId`, also from ADR-0019) with a
  synthetic instruction built by `buildContinuationPrompt`
  (`continuation-prompt.ts`) that embeds the partial reply's own tail (the
  last ~6,000 characters) and asks the model to resume from exactly there.
  This embedding is necessary because pilot-ai's Mastra thread never
  recorded the cut-off reply in the first place (see below) — Pilot's own
  Postgres history is the only place it exists.
- **Appending, not duplicating**: `persistReply` and `failTurn` both check a
  new `TurnInput.appendToMessageId` field. When set (only true for a
  continue turn), a successful reply calls the new
  `appendConversationMessageContent` (`conversation-message-repository.ts`)
  to concatenate onto the existing message and clear `isPartial`, instead of
  inserting a new row. If a continue is itself stopped, the same append path
  runs again with `isPartial: true`, so a reply can be stopped and resumed
  more than once.
- **Client UX**: `cancel()` no longer wipes the visible completion text the
  instant Stop is clicked. It calls `stop()`, then waits ~500ms (enough for
  the server's `failTurn` to persist the partial reply) before clearing
  local state and re-syncing the transcript — long enough to avoid a flash
  of empty content, short enough not to read as a delay. The Continue action
  appears only on a `isPartial` message that is still last in the
  conversation; Regenerate and Continue are mutually exclusive on the same
  message.

## Why the runtime's own memory can't just recall the cut-off text

Mastra's `Memory` only saves a turn's messages after generation completes
(or incrementally with `savePerStep: true`, which pilot-ai does not set). An
aborted `agent.stream()` call today leaves **no trace** in the thread — not
the partial assistant text, nothing. This was confirmed by tracing
`createMapResultsStep`'s `savePerStep` gate in `@mastra/core` before
building this feature. Rather than turning on step-level saves (which would
also change memory behavior for every ordinary turn), continue treats
Pilot's Postgres as the sole source of truth for the partial reply and
re-injects it explicitly — consistent with how edit and regenerate
(ADR-0019) already treat the runtime's memory as a disposable, recomputable
cache rather than authoritative history.

## Consequences

- A continuation is a fresh model call with no memory of its own immediately
  prior output beyond what's pasted into the prompt — for a very long
  partial reply, only the last ~6,000 characters are given as context, which
  is a prompt-engineering compromise, not a structural guarantee of perfect
  continuity.
- Forwarding the abort signal narrows, but does not eliminate, wasted
  provider compute on a stop — how quickly a given model provider's own SDK
  honors an abort is outside Pilot's control.
- No message versioning or "(stopped once, continued twice)" history is
  recorded — `isPartial` is a point-in-time flag, not an audit trail.

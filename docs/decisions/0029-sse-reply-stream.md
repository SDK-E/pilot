# Real SSE framing for the browser-facing reply stream

Status: implemented on 2026-09-18, with two items explicitly descoped (see
Consequences).

## Context

The browser↔pilot reply stream was plain `fetch` + `ReadableStream` text
(`streamProtocol: "text"` on `@ai-sdk/react`'s `useCompletion`,
`content-type: text/plain`) — not real SSE, and not even the AI SDK's own
structured data-stream protocol. pilot↔pilot-ai, by contrast, already spoke
real `text/event-stream`. A plain-text stream has no place to carry a
graceful mid-stream error frame — a failure partway through a reply had no
way to reach the client except closing the connection outright, indistinguishable from a clean finish cut short.

## Decision

`src/conversations/stream-protocol.ts` defines this app's own minimal wire
format — `data: {"type":"text","text":...}\n\n` /
`data: {"type":"error","message":...}\n\n` framing — encoded server-side by
`encodeStreamEvent` (`conversation-turn.ts`'s `streamMessage`) and decoded
client-side by `parseStreamEvents`. The route's `content-type` changed to
`text/event-stream; charset=utf-8`. `src/components/conversations/
use-sse-completion.ts` is a purpose-built ~120-line replacement for
`@ai-sdk/react`'s `useCompletion`, keeping the same external shape
(`complete`/`completion`/`input`/`isLoading`/`stop`/`error`) so nothing
above it in `use-conversation-stream.ts` needed to change. The
`@ai-sdk/react` package dependency was removed entirely.

A hand-rolled protocol was chosen over adopting the AI SDK's
`toUIMessageStreamResponse` data-stream protocol specifically because this
app's failure mode (a graceful mid-stream error) is simple and already
fully solved by two event types; adopting the richer typed-parts protocol
would have been a much larger surface change for a capability this app
does not yet need elsewhere.

## Consequences

- A mid-stream pilot-ai failure now reaches the browser as a clean error
  frame over the same open connection, rather than a reset connection the
  client could only interpret as "done."
- Test coverage: `stream-protocol.test.ts`'s AC-08-02 suite covers
  mid-character UTF-8 splits, unknown/out-of-order event types, a stream
  with no terminal event, and malformed JSON — all fail closed (dropped
  frame, never a false success).
- **Explicitly not done, and known incomplete against the original plan**:
  - **No cross-chunk resume-with-cursor.** If the connection drops mid-turn
    (network blip, tab backgrounded, or an ADR-0026 chunk boundary), the
    client has no way to reopen the same logical stream from a cursor — it
    simply re-fetches the transcript on the next user action, the same
    behavior as before this ADR. Building real resume needs a persisted
    cursor scheme against `activity_events`' ordering and a GET replay
    endpoint; sized as its own slice, not attempted here.
  - **Activity/tool-trace events do not ride this stream.**
    `use-activity-polling.ts` still polls `/api/conversations/[id]/activity`
    every 400ms during an active turn. The reason is architectural, not an
    oversight: tool activity is recorded by a _separate_ authenticated
    callback from pilot-ai (`/api/runtime/activity`), which may land on a
    different serverless instance than the one holding this stream's
    `ReadableStream` open. Merging the two would need real cross-request
    pub/sub (Postgres `LISTEN`/`NOTIFY`, or a Redis channel) — a genuine new
    piece of infrastructure, not a wire-format extension — and this pass
    intentionally did not add one, consistent with this codebase's standing
    rule against reintroducing durable substrates without a clear need.
    `use-activity-polling.ts` and `use-background-run-resync.ts` remain
    exactly as they were; both are still load-bearing for the case ADR-0026
    already flags as unsolved (a run resumed by cron with nobody's tab
    open), so neither was slimmed down.

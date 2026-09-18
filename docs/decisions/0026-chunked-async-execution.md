# Chunked async execution for every agent kind

Status: implemented on 2026-09-18.

## Context

ADR-0025 gave Work-kind turns a durable `work_runs` record but explicitly
deferred the actual background dispatch loop — the piece that lets a turn
keep working past the lifetime of the HTTP request that started it. That gap
stopped being theoretical: a real Work run doing multi-step web research hit
`Vercel Runtime Timeout Error: Task timed out after 300 seconds` on pilot-ai's
`/api/v1/chat/completions` in production. This Vercel team is confirmed on
the Hobby plan — 300s is a hard ceiling, not a configurable budget, and
Vercel Queues (the natural primitive for real background dispatch) needs a
paid Pro+ plan this team does not have.

Separately, a real client-side bug compounded this: `use-conversation-stream.ts`'s
own `RESPONSE_TIMEOUT_MS` watchdog was set to 155s — below the server's own
260s internal timeout — so the browser was independently aborting slow but
healthy turns and showing "The response timed out" well before the server
ever got a chance to finish or gracefully defer. Fixed by raising it to 295s
(just under the platform's 300s ceiling), so the mechanism below actually
gets a chance to run instead of being pre-empted by the client.

The user's direction was explicit: this must not be a Work-only patch —
every agent kind (Chat, Work, Code) should stop being bounded by one HTTP
request's lifetime.

## Decision

Convert a turn cut off by its own internal timeout into an automatic,
resumable continuation instead of a failure, and drive its resumption from
the external cron scheduler already wired for `/api/cron/reap-stale-runs`
(ADR-0025) — no Vercel Queues, no Pro+ plan, no change to pilot-ai.

`work_runs` is generalized to every agent kind and renamed to `agent_runs`
(`src/executions/agent-run-repository.ts`, migration 0049): `beginTurn`
(`conversation-turn.ts`) now opens one for every kind, not only `work`, sized
by a new per-kind `AGENT_RUN_MAX_STEPS` map (`agent-kinds.ts`, mirroring
pilot-ai's `AGENT_KINDS.<kind>.limits.maxSteps`: 50/150/300 for chat/work/
code).

## Mechanism

- **Distinguishing a timeout from a real failure or a user stop**:
  `streamMessage` (`conversation-turn.ts`) already aborts a turn at
  `STREAM_TIMEOUT_MS` (260s) to stay under pilot-ai's own 300s ceiling. It
  now tracks _why_ the abort fired (`didTimeout`), separately from whether
  the client itself disconnected (`clientSignal.aborted`). Only an abort
  that's a timeout and not a client disconnect is eligible to defer.
- **Deferring instead of failing**: `didDeferTurn`
  (`conversation-turn-failure.ts`) persists whatever text had streamed so
  far as an `isPartial` reply — the exact mechanism a user-initiated stop
  already used (`keepPartialReply`) — then calls
  `didMarkAgentRunNeedsContinuation`, which flips the run's status to
  `needs_continuation` and increments `continuationCount`. The turn's
  `executions` row is closed normally (not as a failure), so the
  conversation is immediately free for a new turn — a deferred run isn't
  "stuck," it's paused. `MAX_CONTINUATIONS` (24, ≈2 hours of chunked
  wall-clock time at ~260s/chunk) caps this: once exhausted,
  `didMarkAgentRunNeedsContinuation` returns false and the turn falls back
  to ordinary `failTurn` handling instead of deferring forever.
- **Resuming automatically**: `/api/cron/continue-runs` (new route, same
  `CRON_SECRET` bearer-token authentication as `reap-stale-runs`) is hit by
  a _separate_ cron-job.org job on a 1-minute interval — tighter than
  `reap-stale-runs`'s, since a paused turn should resume quickly, not wait
  for a daily-capable Vercel-native cron. Each tick atomically claims one
  `needs_continuation` run at a time
  (`claimRunsNeedingContinuation`, `WHERE status = 'needs_continuation'`, so
  concurrent ticks can never double-claim), rebuilds the same
  `buildContinuationPrompt` + `appendToMessageId` request a manual "Continue"
  click already produces (ADR-0020's precedent), and drives it through the
  same `streamMessage` the browser uses — just with nobody reading the
  bytes. If that chunk also hits the internal timeout, it defers again and
  the next tick picks it up; a run needing many chunks simply cycles through
  this loop until it finishes, fails, or exhausts `MAX_CONTINUATIONS`.
- **One logical run across many chunks, not one row per chunk**: each
  continuation chunk opens a _new_ `executions` row (turns are inherently
  per-HTTP-call), but `agent_runs.executionId` is unique per row. Rather
  than insert a second `agent_runs` row per chunk — which would orphan the
  original and break "one active run per conversation" — `startAgentRun`
  accepts an optional `continuingRunId`: when set (only
  `/api/cron/continue-runs` sets it), it re-points the _same_ row at the new
  chunk's `executionId` instead of inserting a new one. `stepCount` and
  `continuationCount` stay cumulative across the whole logical run;
  `getActiveAgentRun`/cancellation still see exactly one row per
  conversation.
- **Cancellation, generalized**: the Work-only
  `/api/conversations/[conversationId]/work/cancel` route moved to
  `/api/conversations/[conversationId]/cancel` and dropped its
  `baseAgentId !== "work"` guard — `didCancelAgentRun` now works for any
  kind, including a run currently paused in `needs_continuation` (cancelling
  flips it out of that status, so the next cron tick leaves it alone).
  `use-conversation-stream.ts`'s Stop button calls it unconditionally now.
- **Staleness**: the reaper (`reapAllStaleAgentRuns`,
  `/api/cron/reap-stale-runs`) now checks `updatedAt`, not `startedAt` — a
  genuinely progressing multi-chunk run keeps bumping `updatedAt` on every
  claim/step/defer, so it never goes stale mid-flight; only a run that
  stopped being touched (a crash, or the continuation sweep itself going
  down) is reaped after 10 minutes. `needs_continuation` was added to the
  reaper's non-terminal set for exactly that reason — it's paused, not done.

## Consequences

- No Pro+ plan, no Vercel Queues, no pilot-ai changes: this is entirely a
  pilot-side mechanism reusing infrastructure that already existed
  (cron-job.org, `buildContinuationPrompt`, `isPartial` messages,
  `agent_runs`'s crash-recovery shape).
- Applies uniformly to Chat, Work, and Code — a long Chat or Code turn now
  gets the same automatic resumption Work does, closing the gap the user
  explicitly called out.
- **What this does not solve**: cross-chunk step-budget enforcement.
  pilot-ai's own `stopAtStepCount(kind.limits.maxSteps)` resets on every
  fresh `/v1/chat/completions` call, since each continuation chunk is a new
  HTTP call from pilot-ai's perspective — it has no notion of "this
  conversation already used N steps in a prior chunk." The real ceiling on
  total work across a whole multi-chunk run today is `MAX_CONTINUATIONS`
  (wall-clock chunks), not a strict cumulative step count. Passing a
  remaining-step budget into pilot-ai's request contract would close this,
  but is cross-repo protocol work deferred for now — not a safety issue
  (bounded by `MAX_CONTINUATIONS` either way), just a softer budget than the
  per-kind `maxSteps` number implies in isolation.
- **What this does not add**: true sub-minute background dispatch. A paused
  run resumes on the next cron tick (up to ~60s later), not instantly, and
  only makes progress while a chunk is actively executing inside a request —
  there is still no long-lived process. For the product's actual
  turnaround, this is a real, honest improvement over "silently killed at
  300s with no recovery," not a claim of true continuous background
  execution.
- Live UX during an auto-resumed chunk is unchanged from today's manual
  "Continue" flow: the client has no push mechanism for a reply edited
  server-side after its own stream already closed
  (`use-conversation-stream.ts` only re-fetches on the next user action or
  reload). A deferred turn shows its partial text with the existing "Stopped
  before finishing" / Continue affordance immediately, and completes
  automatically in the background — visible on the next reload or user
  action, whichever comes first. Live-updating the transcript while a
  continuation runs elsewhere is a follow-up UI slice, not a data or
  correctness gap.

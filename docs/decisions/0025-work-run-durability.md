# Work run durability: persistence, recovery, and cancellation (Phase 1)

Status: implemented on 2026-09-18 (partial — see "Deferred").

## Context

Today every agent kind, including Work, runs one synchronous turn per HTTP
request: `POST /api/conversations/[conversationId]/stream` opens an
`executions` row, drives pilot-ai's `agent.stream()` to completion within
that single request, and closes the row before responding (see
`src/conversations/conversation-turn.ts`). That request is bounded by
`STREAM_TIMEOUT_MS` (260s) inside this Vercel plan's hard `maxDuration`
ceiling (300s, `stream/route.ts`). If the browser tab closes, the client
aborts, or the function is killed, the run stops — there is no persistence
of Work-specific run state, no way to resume it, and no way to cancel it
except closing the tab (which only works while that tab still holds the
request open) or waiting for `reapStaleExecutions`'s ten-minute timeout.

Per `docs/roadmap-chat-baseline.md` (ChatGPT Work / Claude Cowork parity
research, Phase A.1), this is the largest remaining gap toward Work having
real autonomous, long-running execution — and it needs its own persistence,
recovery, cancellation, and budget contract rather than being bolted onto
the existing synchronous turn model, which is why prior sessions correctly
deferred it (see docs/progress.md, "Pilot Work foundation" and its
2026-09-18 correction).

A prior attempt at durable execution scaffolding (`ExecutionV2`,
`DurableRun`/`DurableAttempt`, `execution_attempts`, `budget_reservations`,
`outbox_events` — migration `0024_durable_execution.sql`) shipped types and
tables but nothing that ever dispatched real work through them; most of its
integration tests stayed `BLOCKED`. Migration `0028_drop_unused_tables.sql`
removed it outright as unused. This ADR does not resurrect that shape —
it is a smaller, real, working slice instead of a larger, unused one.

This also does not touch or revive the old owner-scoped task/approval
queue (`tasks`/`approvals`/`approval_rules`, dropped by migration
`0036_drop_tasks_approvals_and_approval_rules.sql` when ADR-0016 replaced
it with the three-kind model). That removal was deliberate and stays
removed; nothing here reintroduces a durable approval/task substrate.

## Decision

Add a new, Work-only persistence layer — `work_runs`
(`src/db/schema/work-runs.ts`) — that survives past one HTTP request, with
its own repository (`src/work/work-run-repository.ts`) for recovery and
cancellation. Chat and Code conversations never get a row here and their
synchronous request/response behavior is completely unchanged.

This is explicitly **Phase 1**: persistence, recovery, and cancellation for
a run that is still triggered and driven within one request/response cycle
today. It does not add a background dispatch loop that keeps working after
the initiating HTTP request returns — see "Deferred" below.

## Mechanism

- **`work_runs`** (`drizzle/0048_new_mordo.sql`, additive): one row per
  Work turn's `executions` row (`executionId`, unique), holding `status`
  (`running | cancelling | cancelled | completed | failed`), `maxSteps`,
  `stepCount`, `cancelRequestedAt`, `startedAt`/`updatedAt`/`completedAt`,
  and `errorMessage`. It is a sibling of `executions`, not a repurposing of
  it — `executions` stays the turn-scoped record shared by every kind.
- **Opening a run**: `beginTurn` (`conversation-turn.ts`) calls
  `startWorkRun` right after `startExecution`, only when
  `input.agent.baseAgentId === "work"`. `maxSteps` is set from
  `WORK_RUN_MAX_STEPS` (`src/agents/agent-kinds.ts`), a hand-kept mirror of
  `AGENT_KINDS.work.limits.maxSteps` (150) in
  `pilot-ai/src/mastra/agents/kinds.ts` — the actual step ceiling pilot-ai's
  agent loop enforces. This is Work's budget contract made visible and
  persisted, not a second place that enforces it; pilot-ai's own loop
  remains the real enforcement.
- **Step tracking**: `POST /api/runtime/activity` (pilot-ai's existing,
  OIDC-verified tool/skill callback) now also calls `recordWorkRunStep` for
  every event, atomically incrementing `stepCount` on the row matching that
  `executionId`. A no-op for Chat/Code executions, which have no row to
  match.
- **Closing a run**: wherever a turn already closes its `executions` row —
  `persistQuestion`, `persistReply` (`conversation-turn.ts`), and `failTurn`
  (`conversation-turn-failure.ts`) — now also calls `finishTurnWorkRun`
  (`turn-shared.ts`), which is a no-op for non-Work turns and otherwise
  marks the run `completed` or `failed` alongside the execution.
- **Recovery**: `reapStaleWorkRuns` mirrors `reapStaleExecutions` exactly —
  same ten-minute staleness window, same "abandoned mid-turn" reasoning —
  and runs at the start of every `startWorkRun` call, closing any
  `running`/`cancelling` row for that conversation left over from a crash,
  a redeploy, or a killed function. A Work run interrupted that way is
  never stuck forever; it resolves to `failed` the next time that
  conversation is used, same guarantee `executions` already gives every
  kind.
- **Cancellation**: `POST /api/conversations/[conversationId]/work/cancel`
  (creator-scoped like every other conversation route, Work-only — a
  non-Work conversation gets a 400) calls `didCancelWorkRun`, which
  immediately marks the active run `cancelled` and closes its `executions`
  row via the existing `finishExecution`, freeing the conversation for a
  new turn right away instead of waiting up to ten minutes for the reaper.
  `useConversationStream`'s existing `cancel()` (the Stop button, already
  shared by every kind) now also calls this endpoint when `kind === "work"`,
  in addition to its existing client-side fetch abort.

## Consequences

- **What cancellation actually guarantees today**: closing the durable
  record and unblocking the conversation, immediately, from any session
  that owns it — not necessarily stopping compute already in flight on the
  original request. If the request that opened the run is still being
  served from the same browser tab, the pre-existing client-side abort
  (`stop()`, threaded into pilot-ai's `abortSignal` per ADR-0020) is still
  what actually interrupts the model call. If it's a different tab, device,
  or a closed browser, the in-flight call runs to its own completion or the
  reaper's timeout, but the user is never blocked from starting a new turn
  waiting for that. This is a real, honest improvement (immediate vs.
  ten-minute recovery) — it is not full remote interruption, which needs
  the dispatch loop below to have anywhere to deliver a cancel signal to.
- **What this does not add**: a way to keep working after the initiating
  HTTP request returns. A Work run today still cannot outlive the tab that
  started it in any way stronger than before this change — closing the tab
  still stops generation. Nothing in the UI claims otherwise; there is no
  "runs in the background" affordance.
- Budget visibility (`stepCount`/`maxSteps`) is persisted and returned as
  `workRun` from `GET /api/conversations/[conversationId]/activity`
  (creator-scoped, via `getActiveWorkRun`), but not yet rendered anywhere
  in the Work UI — that's a follow-up UI slice, not a data-model or API
  gap.
- Cross-device cancellation is only reachable from a session that already
  has the conversation open and its own `isLoading` state true (the Stop
  button); there is no standing "a Work run is active — cancel it" control
  visible from a tab that didn't start the run. The endpoint and repository
  function are ready for that UI; it isn't wired yet.

## Deferred: the actual background dispatch loop

Making a Work run keep executing after the initiating HTTP request returns
needs a real dispatcher, which this slice does not add:

- **No queue or scheduler is wired into either repo today.** Neither
  `pilot`'s nor `pilot-ai`'s `package.json` depends on a job queue, and
  neither `vercel.json` declares a cron. `pilot-ai`'s own
  `maxDuration: 300` on `/v1/chat/completions` is this Vercel plan's hard
  ceiling (Hobby), not a configurable budget — there is no long-lived
  server process this platform supports to fall back to.
- The two realistic primitives for that dispatcher are Vercel Cron
  (polling a `work_runs` row that's due for its next step) or a queue
  primitive (Vercel Queues / QStash-style), each invoking a short-lived
  function per step instead of one function holding the whole run open.
  Either requires the plan this environment is on to support the needed
  cron frequency or a queue product — unverified from this pass and a
  prerequisite to actually building it, not an implementation detail to
  guess at.
- Real interruption of a step already in flight, from any device, needs
  that same dispatcher to have a signal to check between steps (this
  slice's `cancelRequestedAt`/`status: "cancelling"` fields already exist
  for exactly that — they're unused by anything today because there is no
  loop yet to check them).
- Until that lands, "Work" is durable and recoverable per-turn, but still
  bounded by one HTTP request's lifetime for actually generating a reply —
  the parity goal of "hands Pilot a task and it keeps going for hours
  unattended" remains not implemented, and README/marketing copy should
  keep saying so.
- 2026-09-18: added a global, cross-conversation stale-run sweep
  (`reapAllStaleExecutions`/`reapAllStaleWorkRuns`) at
  `/api/cron/reap-stale-runs`, so a conversation abandoned after a crash
  and never revisited still gets reaped, not just one that happens to
  start a new turn. This Vercel team is on the Hobby plan, whose cron jobs
  are capped at once per day (confirmed against Vercel's own docs,
  vercel.com/docs/cron-jobs/usage-and-pricing) — rather than accept that
  ceiling, the route is triggered by an external HTTP cron scheduler
  (cron-job.org: free, unlimited jobs, down to 1-minute intervals, custom
  headers) instead of Vercel's own `crons` config, so the sweep itself
  isn't limited to once daily. Vercel Queues — the real primitive for
  sub-minute background _dispatch_ (continuing a run's actual work, not
  just reaping abandoned ones) — still requires a paid Pro+ plan this team
  does not have; an external cron hitting a stateless sweep route sidesteps
  the cron-frequency ceiling but cannot substitute for a queue, since there
  is still no mechanism to resume a step-by-step run between HTTP requests.
  The background dispatch loop described above therefore remains deferred
  pending a plan upgrade.

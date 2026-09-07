# Execution and activity records

Status: accepted for the durable execution slice.

Pilot records one execution after an authorized user message is persisted and
before it invokes the protected runtime. An execution belongs to exactly one
organization, agent and Pilot-owned conversation. Its lifecycle is `running`,
`completed`, or `failed`; its optional runtime-run identifier is audit metadata,
not an authorization input.

`activity_events` is an append-only, organization-scoped record of execution
lifecycle events. The initial events deliberately expose only concise safe
status (`Generating a response`, `Response completed`, or `Response failed`).
No model reasoning, tool input, tool output, credential, user attachment,
tool error, or URL is stored in this table.

The `0008_complex_justin_hammer` migration adds a narrow tool-lifecycle shape:
`tool.started`, `tool.completed`, and `tool.failed`, optionally correlated by a
tool call ID. Pilot derives its summary from a fixed capability map, such as
`Searching the web…`; callers cannot supply a summary or payload. This makes
the chat's expandable activity row ready for verified tool events while keeping
the audit data useful and safe. It does not make a tool available, expose a
tool result, or authorize a tool call.

A completed activity event may reference the immutable Worker response that it
describes. This lets the chat render a collapsed status beneath that response
without guessing from client state. Start and failed events have no response
reference. The initial interface renders completed status only; it is not a
claim of streaming or detailed tool/reasoning activity.

The message service marks a run failed if runtime generation fails or if the
returned response cannot be persisted. It never creates a conversation for an
empty composer. Conversation and agent deletion cascade to their executions and
activity, while Pilot first clears the runtime conversation memory through its
authenticated runtime boundary.

Read models must query organization and conversation ownership together. The
dashboard's running-task metric comes from these persisted executions rather
than browser state.

## Sources checked on 2026-09-07

- [Drizzle indexes and constraints](https://orm.drizzle.team/docs/indexes-constraints)
  — application-owned relational records use explicit foreign keys and indexes.
- [Vercel AI SDK persistence guide](https://vercel.com/docs/ai/ai-sdk/core/generating-text#persistence)
  — durable generation records need stable identifiers and server-owned state.

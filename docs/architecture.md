# Architecture

A short map of Pilot's system boundaries, distilled from the ADRs in
[`decisions/`](decisions/) and the (now removed) `pilot-platform` planning
notes. The ADRs are the authoritative, load-bearing source when this page
and one of them disagree.

## Services

- **Pilot** (this repo) — the Next.js App Router product: domain logic,
  WorkOS authentication and authorization, product state (agents,
  conversations, projects, executions/activity), and the Neon database.
- **Pilot AI** (`pilot-ai`, separate repo) — the Mastra runtime that
  actually executes agents, tools, and durable workflows. Pilot never
  imports Mastra into its domain code, and pilot-ai never imports Pilot
  domain code — the two communicate only over the authenticated HTTP
  boundary in `src/ai/pilot-ai-client.ts` and `/api/runtime/*`.

## Authentication boundaries

- **WorkOS** authenticates humans in Pilot (AuthKit + the WorkOS Node SDK).
  See `.claude/skills/workos/SKILL.md` and root `AGENTS.md` §Security
  rules.
- **Vercel OIDC** authenticates Pilot's calls to the Pilot AI runtime
  (`getVercelOidcToken()`, verified by pilot-ai's own JWKS check).
- **WorkOS M2M** (client_credentials) authenticates the reverse direction:
  the Pilot AI runtime calling back into Pilot's `/api/runtime/*`
  callbacks (`src/ai/workos-m2m.ts`,
  [ADR-0017](decisions/0017-workos-m2m-runtime-auth.md)).

These three credentials are never interchangeable — don't reuse one to
satisfy another boundary.

## Data stores

- **Neon (Postgres)** — Pilot's business data: organizations, agents,
  conversations, messages, executions, activity, projects. Accessed only
  through `src/db/` (Drizzle) and always creator/organization-scoped.
- **Vercel Blob** — private conversation attachments and project files
  (`src/files/`), served only after a session check.
- Mastra's own memory/session storage lives inside pilot-ai's runtime and
  is out of scope for this repo.

## Product model

Three agent kinds — **Chat**, **Work**, **Code** — defined once in
`src/agents/agent-kinds.ts` ([ADR-0016](decisions/0016-three-agent-kinds.md)).
Each kind is a mode of the app with its own default agent and tool
allowlist; in Pilot AI all three derive from one base agent and differ only
in instructions and capabilities. Tools (`web-search`, `scratchpad`,
`ask-user`, `plan`, `code-sandbox`) are listed in `src/agents/agent-tools.ts`;
an enabled, kind-allowed tool just runs, with no separate approval step.
Web search and the code sandbox are additionally gated by an
organization's `webSearchEnabled`/`codeSandboxEnabled` preference
(editable from Settings, no deploy needed) and by platform-level env flags
on pilot-ai's side as an independent circuit breaker.

## Execution and activity

Conversation turns and any durable work an agent performs are recorded as
execution/activity records containing capability IDs, call IDs,
server-generated summaries, and a bounded, server-formatted `detail` for
completed tool calls ([ADR-0018](decisions/0018-tool-call-transparency.md)).
Model reasoning, prompts, secrets, and browser-supplied activity are never
persisted. See [ADR-0006](decisions/0006-execution-activity-records.md) and
[ADR-0012](decisions/0012-runtime-verified-state.md).

## Where to look next

- [`decisions/`](decisions/) — the full ADR set, status-tracked
  (proposed → accepted → implemented → superseded).
- [`progress.md`](progress.md) — current implementation status; its
  "Current state" section is the source of truth over any narrative below
  it.
- [`development.md`](development.md) / [`deployment.md`](deployment.md) —
  running and shipping the app.

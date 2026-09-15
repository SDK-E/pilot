# Pilot by SDK Enterprises

Pilot is an AI workforce platform. It offers three kinds of agent, each with
its own mode of the app:

- **Chat** — ask anything, think out loud, get a clear answer.
- **Work** — hand Pilot a task; it plans and works through it end to end.
- **Code** — read, explain, and propose code changes as reviewable diffs.

Every organization gets its own configurable, organization-scoped agents,
protected streaming conversations, durable execution activity, and private
attachments and project files. Agents can be granted web search, a
scratchpad, an `ask-user` clarification pause, a visible plan/step list, and
a sandboxed code execution tool — each gated per-organization from Settings.
Browser automation, external-write integrations, shared projects, and
semantic knowledge retrieval remain unavailable.

See [implementation status](docs/progress.md) and the
[three agent kinds decision](docs/decisions/0016-three-agent-kinds.md) for
what's actually built and verified today. Pilot is in active development;
do not treat the current state as production-ready.

## Quick start

Requires Node.js 24 and pnpm 11.25.0.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

`.env.local` needs a WorkOS application (API key, client ID, cookie
encryption secret of at least 32 characters, callback
`http://localhost:3000/auth/callback`) and, for full functionality, a
connection to the Pilot AI runtime. See `.env.example` for every variable
Pilot reads. Use an active organization membership to enter a workspace.

For contributing, running the full verification pipeline, and test details,
see [`docs/development.md`](docs/development.md). For deployment, see
[`docs/deployment.md`](docs/deployment.md).

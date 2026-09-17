<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Pilot

Read `docs/progress.md` ("Current state"), `docs/decisions/0016-three-agent-kinds.md`, and `docs/decisions/0004-mastra-conversation-runtime-contract.md` before continuing. Keep them synchronized with verified implementation and environment changes.

### Product model

- Three agent kinds, **Chat**, **Work**, and **Code**, defined once in `src/agents/agent-kinds.ts`. Each kind is a mode of the app (`/chat`, `/work`, `/code`) with its own default agent and tool allowlist. In Pilot AI all three derive from one base agent and differ only in instructions and capabilities.
- Tools are `web-search`, `scratchpad`, `ask-user`, `plan`, `code-sandbox`, and one dynamic `connector` tool, listed in `src/agents/agent-tools.ts`. An enabled tool that is allowed for the agent's kind just runs — there is no approval or suspension step, matching Claude Code/Codex. Web search and the code sandbox are also gated by the organization's `webSearchEnabled`/`codeSandboxEnabled` preferences (`src/organizations/organization-preference-repository.ts`, editable from Settings by owners/admins — not an environment variable, so toggling one needs no deploy); pilot-ai still enforces its own `webSearchEnabled`/`codeSandboxEnabled` Edge Config flags (`src/mastra/server/feature-flags.ts`, backed by the `EDGE_CONFIG` connection string, toggled from the Vercel dashboard with no redeploy) as a platform-level circuit breaker independent of any org's setting. The sandbox runs each call in a fresh Vercel Sandbox with no access to Pilot's own systems, secrets, or data. Every connector — GitHub, Slack, or one an admin adds from scratch — is a row in `connector_definitions` (`src/connectors/`, [ADR-0023](docs/decisions/0023-dynamic-connectors.md), superseding ADR-0021), driven by one generic OAuth2 + REST engine (`base-connector.ts`, `adapters/base-connector-adapter.ts`) instead of per-provider TypeScript code. The `connector` tool is gated by whether the org has at least one active connection, plus pilot-ai's own `connectorsEnabled` Edge Config circuit breaker. A connector action may set `isMutating: true`; the engine then never executes it on a bare call — it returns `confirmationRequired` and only runs once the caller passes `confirm: true`, so an agent must get the user's explicit go-ahead (e.g. via `ask-user`) first. This in-conversation gate is the whole approval mechanism — never reintroduce a durable approval/task table for this (see ADR-0023). A built-in connector's shared OAuth app credentials and the GitHub Marketplace webhook secret are platform admin-managed from `/admin/connector-providers`, backed by `connector_provider_credentials`/`platform_secrets` ([ADR-0024](docs/decisions/0024-platform-managed-secrets.md)); only master encryption keys and deployment-topology secrets remain env vars.
- The `plan` tool (the agent's own visible step list) and the `ask-user` clarification pause are unrelated to tool gating and are never removed alongside it. Do not add a new tool, kind, or mode until it has equivalent authorization, activity, and storage behavior.

### Code layout

- Next.js App Router with the route group `src/app/(workspace)/`. Domain code lives outside `app/` in `src/<domain>/` (agents, conversations, projects, executions, organizations, users, files, db). Shared UI is under `src/components/<area>/`; vendored shadcn and AI Elements components under `src/components/ui` and `src/components/ai-elements` are lint-ignored and must not be edited by hand.
- Keep product logic in Pilot and Mastra implementation in `pilot-ai`. Prefer maintained packages, Mastra runtime capabilities, and official shadcn components over custom infrastructure.
- ESLint is fully strict (`pnpm exec eslint .` must report zero problems), as are `tsc --noEmit`, `knip`, and `prettier --check`. Keep files under 300 lines and functions under 60 (150 for React components and hooks). Every rule override in `eslint.config.mjs` carries a comment saying why.

### Security rules

- WorkOS is the required auth provider. Every page, Server Action, and API route starts with `getWorkspaceSession()` (or `requireWorkspaceSession()`), which checks the signed-in user and active organization membership. Never trust a submitted organization ID or a model decision as authorization. Route Handlers that need a session must be matched in `src/proxy.ts`, with an anonymous and forged-session boundary test.
- Conversations, projects, and attachments are creator-scoped within an organization. Filter every query by `createdByWorkosUserId`; membership alone never grants access to another member's data.
- The runtime client (`src/ai/pilot-ai-client.ts`) and message records are server-only. Runtime callbacks (`/api/runtime/*`) verify the WorkOS M2M token before reading the body and derive all ownership from the execution record, never from the payload.
- Activity records hold capability IDs, call IDs, server-generated summaries, and — for a completed tool call — a bounded (~4000 char), server-formatted `detail` of its real command/output/results ([ADR-0018](docs/decisions/0018-tool-call-transparency.md)). Still never persist model reasoning, prompts, secrets, or browser-supplied activity; `detail` is built server-side from a fixed per-capability formatter, never accepted as free-form input from a caller.
- Agent instructions (goals, tone, output format) are built on the server by `buildAgentInstructions` at every runtime boundary; never accept an instruction packet from the browser.
- Keep local, preview, and production secrets separate. Never log or commit credentials. Production migrations run only from the Vercel production build (`VERCEL_ENV=production`) — never run a migration against a production `DATABASE_URL` from a local machine. `pnpm env:pull:production` (`scripts/push-env.sh`) may be used to sync production env vars to a local `.env.local` while the product is pre-launch with no real production data/users; re-tighten this once production carries real data, since a locally-pulled production `DATABASE_URL` should never be pointed at from a local dev server or script at that point.
- No `getSignInUrl()` or cookie-writing helpers during Server Component rendering. Sign-out is a POST Server Action.

### Verification

Run `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:server`, `pnpm test:db`, and `pnpm audit --audit-level high` before calling a slice complete. A green build is not evidence of successful authentication or durable execution.

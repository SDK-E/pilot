<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Pilot

Read `docs/progress.md` ("Current state"), `docs/decisions/0016-three-agent-kinds.md`, and `docs/decisions/0004-mastra-conversation-runtime-contract.md` before continuing. Keep them synchronized with verified implementation and environment changes.

### Product model

- Three agent kinds, **Chat**, **Work**, and **Code**, defined once in `src/agents/agent-kinds.ts`. Each kind is a mode of the app (`/chat`, `/work`, `/code`) with its own default agent and tool allowlist. In Pilot AI all three derive from one base agent and differ only in instructions and capabilities.
- Tools are `web-search`, `scratchpad`, and `ask-user`, listed in `src/agents/agent-tools.ts`. A rule is `ask`, `allow`, or `deny`. A tool runs only when its rule is `allow`, or `ask` and the user approved the durable suspension. Web search is also gated by `PILOT_ENABLE_WEB_SEARCH`.
- Do not add a new tool, kind, or mode until it has equivalent authorization, activity, storage, and approval behavior.

### Code layout

- Next.js App Router with the route group `src/app/(workspace)/`. Domain code lives outside `app/` in `src/<domain>/` (agents, conversations, approvals, projects, executions, organizations, users, files, db). Shared UI is under `src/components/<area>/`; vendored shadcn and AI Elements components under `src/components/ui` and `src/components/ai-elements` are lint-ignored and must not be edited by hand.
- Keep product logic in Pilot and Mastra implementation in `pilot-ai`. Prefer maintained packages, Mastra runtime capabilities, and official shadcn components over custom infrastructure.
- ESLint is fully strict (`pnpm exec eslint .` must report zero problems), as are `tsc --noEmit`, `knip`, and `prettier --check`. Keep files under 300 lines and functions under 60 (150 for React components and hooks). Every rule override in `eslint.config.mjs` carries a comment saying why.

### Security rules

- WorkOS is the required auth provider. Every page, Server Action, and API route starts with `getWorkspaceSession()` (or `requireWorkspaceSession()`), which checks the signed-in user and active organization membership. Never trust a submitted organization ID or a model decision as authorization. Route Handlers that need a session must be matched in `src/proxy.ts`, with an anonymous and forged-session boundary test.
- Conversations, projects, attachments, tasks, and approvals are creator-scoped within an organization. Filter every query by `createdByWorkosUserId`; membership alone never grants access to another member's data.
- The runtime client (`src/ai/pilot-ai-client.ts`) and message records are server-only. Runtime callbacks (`/api/runtime/*`) verify the Vercel OIDC token before reading the body and derive all ownership from the execution record, never from the payload.
- Activity and approval records hold only capability IDs, call IDs, and server-generated summaries. Never persist reasoning, prompts, tool input or output, URLs, errors, or browser-supplied activity.
- Agent instructions (goals, tone, output format) are built on the server by `buildAgentInstructions` at every runtime boundary; never accept an instruction packet from the browser.
- Keep local, preview, and production secrets separate. Never log or commit credentials. Production migrations run only from the Vercel production build (`VERCEL_ENV=production`); never pull a production `DATABASE_URL` locally.
- No `getSignInUrl()` or cookie-writing helpers during Server Component rendering. Sign-out is a POST Server Action.

### Verification

Run `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:server`, `pnpm test:db`, and `pnpm audit --audit-level high` before calling a slice complete. A green build is not evidence of successful authentication or durable execution.

# AGENTS.md — Application Source

## Structure

- `src/ai/` — AI client, OIDC verification, runtime integration
- `src/agents/` — Agent configuration and cataloguer
- `src/organizations/` — Organization membership and authorization
- `src/proxy.ts` — AuthKit route matching
- `src/app/` — Next.js App Router pages and API routes
- `src/db/` — Drizzle schema and queries
- `src/conversations/` — Conversation domain logic
- `src/executions/` — Execution and activity records
- `src/projects/` — Project domain logic
- `src/tasks/` — Task domain logic
- `src/workers/` — Worker domain logic
- `src/users/` — User domain logic
- `src/files/` — File domain logic
- `src/approvals/` — Approval domain logic
- `src/components/` — UI components
- `src/hooks/` — React hooks
- `server-tests/` — Server-side integration tests
- `tests/` — Domain and integration tests

## Rules

- Keep product/domain logic in Pilot; Mastra implementation in pilot-ai.
- All server mutations must authenticate via WorkOS.
- Filter by createdByWorkosUserId for private chat ownership.
- Run pnpm check, pnpm build, pnpm test, pnpm test:server, pnpm test:db, pnpm audit --audit-level high for completed slices.

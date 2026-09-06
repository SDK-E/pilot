# Kilo Code handoff: Pilot

Pilot is an open-source, self-hostable AI workforce product. Ship the product, not a generic agent demo. The complete objective is in the active Codex goal file:

`/Users/hsaddek/.codex/attachments/b8b146de-33e5-4299-8e56-64f887d8f5d1/goal-objective.md`

Read that file, [AGENTS.md](AGENTS.md), [implementation status](docs/progress.md), and the architecture decisions before changing code.

## Mandatory goal discipline

Use the goal tool as the work controller. Do not begin a broad “finish Pilot” implementation turn.

1. Inspect the repository, external configuration, instructions, and current goal state.
2. Create one goal only for the smallest coherent vertical slice that advances the first Worker end-to-end milestone.
3. Research current official documentation, installed package APIs, maintained packages, and applicable skills before choosing an implementation.
4. Implement that one slice completely: authorization, persistence, UI, tests, documentation, and actual verification.
5. Run the required checks. Review for tenant escapes, dead code, duplication, security problems, and unnecessary custom utilities.
6. Update `docs/progress.md`, relevant ADRs, `AGENTS.md`, and this handoff if the verified state changes.
7. Reassess the full goal. Mark the goal complete only when that exact slice is proven complete. Then start the next slice in a new goal.

If a required credential, approval, or external action is missing, continue with independent work first. Mark a goal blocked only after the same genuine blocker has recurred for three consecutive goal turns.

## Non-negotiable product boundaries

- `pilot` owns the Next.js product, WorkOS authorization, Pilot domain records, and application orchestration.
- `pilot-ai` owns Mastra runtime adapters only. It must not invent Pilot domain records, bypass Pilot authorization, or expose standalone unauthenticated agent endpoints.
- `pilot-integrations` owns external tools, MCP adapters, and provider integrations.
- `pilot-ui` owns shared shadcn-based design-system sources. Do not grow competing primitives in each repository.
- Pilot Workers are organization entities, never separate hardcoded “browser”, “developer”, or “marketing” architectures.
- Mastra is a runtime dependency. Prefer its maintained memory, workflows, tools, approvals, suspend/resume, tracing, and durable execution capabilities over custom equivalents.
- Security is system-enforced. Every read and mutation must scope organization ownership; models cannot authorize themselves or grant capabilities.
- Do not expose browser, filesystem, shell, MCP, integration, schedule, or externally visible tools before permissions, explicit approval, durable suspension, and idempotent resumption exist.
- Vercel functions are not durable processes. Persist durable state in Neon/Mastra-supported stores and prove restart recovery.

## Current verified state

`pilot` branch `main` contains the committed first slices through `8d0ed29`:

- WorkOS AuthKit sign-in/callback, proxy protection, POST sign-out, organization switch and membership checks.
- Pilot-owned organizations, members, workers, and organization-scoped conversations in Neon.
- Worker creation and read-only configuration page. Authorized members can create, list, and inspect empty conversation sessions. A conversation UUID is reserved as the future Mastra thread ID; conversations are not runnable and cannot accept messages yet.
- The local WorkOS CLI emulator has verified the real AuthKit PKCE sign-in and callback path into Pilot, including the authenticated no-membership state, POST sign-out and the cleared local session. The emulator's logout endpoint does not redirect after receiving Pilot's POST sign-out, so verification explicitly revisited `/workspace` to confirm authorization restarted. A small server-action-module fix keeps the Worker creation state value out of a `"use server"` module; it must be deployed before treating the auth slice as closed.
- Migrations `0000_initial_worker_domain` and `0001_wild_marauders` are applied to development, preview, and production Neon projects.
- CI runs static checks, production build, Playwright anonymous-boundary tests, and `pnpm audit --audit-level high`.
- `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:db`, and `pnpm audit --audit-level high` passed after the server-action-module authentication fix. Re-run all of them for every new slice.

`pilot-ai` now contains an unreviewed `pilot-browser` implementation with browser/research tools, local LibSQL fallback, DuckDB observability, Mastra Editor, subagents, processors, and evaluators. It is not a Pilot capability and must not be deployed, called, or merged into the product boundary. Do not add to it as a shortcut. Before any integration, replace file-backed and local database storage with the approved Neon-backed runtime design, remove or gate every capability behind Pilot's server-enforced authorization and explicit approvals, and prove durable suspension/resume and idempotent recovery.

## Infrastructure status

- Vercel project: `sdk-enterprises/pilot`; GitHub `SDK-E/pilot`, production branch `main`.
- Production origin: `https://pilot.sdk.enterprises`.
- Production WorkOS application: SDK Pilot, client `client_01M1R77E8ZZ7689T03CF1SANDY`; key, client ID, cookie password, and callback URI are configured in Vercel Production.
- Development uses a separate WorkOS application and Neon project. Preview has only its isolated Neon credentials; its inherited WorkOS API key, cookie password, and local client ID were removed on 2026-09-06. Preview still needs its own WorkOS application/client/key and allowed callback URL. Never reuse production credentials in preview/development.
- Neon projects: production `empty-fog-95658984`, development `wandering-shadow-84624750`, preview `proud-wildflower-67913684`.

Before relying on deployment, inspect the current Vercel deployment and logs. The initial production deployment failed because pnpm blocked `esbuild`; `7eb4588` explicitly allows it. Commit `f9c3ff3` then deployed successfully to `https://pilot.sdk.enterprises`; verify the latest deployment rather than assuming a later push passed.

## Required checks for a completed persistence slice

```sh
pnpm check
pnpm build
pnpm test
pnpm test:db
pnpm audit --audit-level high
git diff --check
```

`test:db` writes short-lived randomized fixtures only to the development Neon project and removes them. Never print, commit, or copy secrets. Migrations use `DATABASE_URL_UNPOOLED`; runtime uses pooled `DATABASE_URL`.

## Recommended next goal

Deploy the pending auth-action-module fix. Then verify the production deployment and real WorkOS sign-in, organization switching, revoked-membership rejection and worker creation. After that, take one goal for persistent Mastra message history on the already-visible selected-worker conversation route. It must:

- Recheck the active WorkOS membership server-side.
- Bind the Pilot conversation UUID to Mastra’s thread ID and a scoped resource ID.
- Persist and render only the current organization’s conversation data.
- Send only a new user message to Mastra, never replay client history.
- Have no tools or autonomous execution yet.
- Use a real configured model gateway and prove a real two-turn memory interaction after a fresh process restart.

Do not begin durable browser execution, integrations, teams, tasks, or approval UX until that conversation/memory slice is demonstrably complete.

# Development

Local setup, environment variables, and the full verification pipeline for
contributors. For the product pitch and a minimal quick start, see the
[README](../README.md). For CONTRIBUTING process (branches, PRs), see
[`CONTRIBUTING.md`](../CONTRIBUTING.md). For the pnpm scripts and CI mapping
in more detail, see `.claude/skills/dev-workflow/SKILL.md`.

## Setup

Requires Node.js 24 and pnpm 11.25.0 (`packageManager` in `package.json`).

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

## Environment variables

See `.env.example` for the authoritative list. In summary:

- `WORKOS_API_KEY`, `WORKOS_CLIENT_ID`, `WORKOS_COOKIE_PASSWORD`,
  `NEXT_PUBLIC_WORKOS_REDIRECT_URI` — your own WorkOS application. Configure
  the callback as `http://localhost:3000/auth/callback`, the initiate-login
  URL as `http://localhost:3000/sign-in`, and the homepage/sign-out URL as
  `http://localhost:3000`. Do not reuse another application's client ID.
  See the [official AuthKit guide](https://workos.com/docs/authkit/nextjs).
- `PILOT_AI_RUNTIME_URL` — the protected Pilot AI Conversation runtime.
  Pilot forwards a short-lived WorkOS M2M token to it; never add a
  long-lived bypass secret here.
- `WORKOS_M2M_AUTHKIT_DOMAIN`, `WORKOS_M2M_CLIENT_ID`,
  `WORKOS_M2M_CLIENT_SECRET` — the WorkOS M2M application Pilot
  authenticates as (client_credentials grant) to call the runtime, from the
  same WorkOS environment as `WORKOS_API_KEY`.
- `DATABASE_URL` — Neon Postgres connection used by `src/db/client.ts` and
  Drizzle migrations.
- Web search and the code sandbox are enabled per-organization from
  Settings (`organization_preferences` in the database), not by an
  environment variable — see the `workos`/`vercel` Claude skills and
  `src/organizations/organization-preference-repository.ts`.

Use an active organization membership to enter a workspace once signed in.

## Database

- `pnpm db:generate` — write a new Drizzle migration from schema changes
  under `src/db/schema/`.
- `pnpm db:migrate` — apply pending migrations to the database named by
  `.env.local`'s `DATABASE_URL` (local/dev use only).
- `pnpm db:migrate:deploy` — the production migration path
  (`scripts/migrate.mts`), run only from the Vercel production build. Never
  run this locally against a production `DATABASE_URL`.

## Full verification pipeline

Before calling a slice of work complete, run all of:

```sh
pnpm check                              # lint + typecheck + format:check + knip
pnpm build
pnpm exec playwright install chromium
pnpm test                               # Playwright
pnpm test:server                        # node:test unit tests
pnpm test:db                            # Neon-backed integration tests
pnpm audit --audit-level high
```

A green run of all of these is still not proof that hosted WorkOS login,
organization switching, sign-out, or a durable background execution
actually work — those need manual or browser-driven verification against a
real WorkOS development environment (see
`.claude/skills/agent-browser/SKILL.md`).

### Playwright (`pnpm test`)

Starts the production build on port 3100 with explicit test-only
credentials. It checks public rendering and unauthenticated security
boundaries (`tests/*.spec.ts`, needs a fresh `pnpm build` first). It does
**not** prove hosted login, organization switching, or logout — those
still need manual verification with a real WorkOS development environment.
There is no fixture yet for authenticated browser flows; don't add skipped
placeholder tests for them, record the gap in `docs/progress.md` instead.

### Unit tests (`pnpm test:server`)

Runs the explicit file list in `package.json`'s `test:server` script
(`server-tests/pilot-ai-stream.test.ts` plus several `tests/*.test.ts` and
`src/ai/workos-m2m.test.ts`) under
`NODE_OPTIONS='--conditions=react-server'`, using `.env.local`.

### Neon integration tests (`pnpm test:db`)

Uses the development Neon database to verify worker persistence and
organization isolation (`tests/*.integration.test.ts`), then removes its
own randomized fixtures. Needs `.env.local` with `DATABASE_URL` pointing at
the isolated development database — never a preview or production one.
Apply committed schema changes first with `pnpm db:migrate`.

### CI

`.github/workflows/quality.yml` runs `pnpm check`, a production build,
Playwright browser tests, and the high-severity audit for pull requests and
`main`, using test-only WorkOS configuration and a local Postgres
`DATABASE_URL` — it does not connect to a real Neon database, so run
`pnpm test:db` yourself before merging a persistence change. See
`.github/AGENTS.md` for what CI currently expects.

---
name: dev-workflow
description: Use when running, building, checking, testing, or migrating this repo (pilot) locally or in CI — i.e. any time you need the exact pnpm command or want to know what a green `pnpm check` does and does not prove.
---

# Dev workflow (pilot)

Node 24, pnpm 11.25.0 (see `package.json` `packageManager`). Always `pnpm install --frozen-lockfile` first.

## Scripts (from `package.json`)

- `pnpm dev` — `next dev`.
- `pnpm build` — `next build`.
- `pnpm start` — `next start` (serves a prior `pnpm build`).
- `pnpm lint` — `next typegen && eslint` (must report zero problems; see AGENTS.md ESLint-strict rule).
- `pnpm lint:fix` — `eslint --fix`.
- `pnpm typecheck` — `next typegen && tsc --noEmit`.
- `pnpm format` / `pnpm format:check` — Prettier write / verify.
- `pnpm knip` — unused files/exports/deps.
- `pnpm check` — `lint && typecheck && format:check && knip`, in that order. This is the single static-checks gate.
- `pnpm db:generate` — `drizzle-kit generate` (writes a new migration under `drizzle/` from schema changes in `src/db/schema/`).
- `pnpm db:migrate` — `dotenv -e .env.local -- drizzle-kit migrate` (applies pending migrations to the local/dev database named by `.env.local`'s `DATABASE_URL`).
- `pnpm db:migrate:deploy` — `tsx scripts/migrate.mts`, the production migration path run only from the Vercel production build (see `vercel.json`); never run this locally against a production `DATABASE_URL`.
- `pnpm test` — Playwright (`tests/*.spec.ts`), needs a fresh `pnpm build` first (it boots the production build on port 3100).
- `pnpm test:server` — `node:test` unit tests listed explicitly in the script (server-tests + several `tests/*.test.ts`), run under `NODE_OPTIONS='--conditions=react-server'` with `.env.local`.
- `pnpm test:db` — Neon-backed integration tests (`tests/*.integration.test.ts`); needs `.env.local` pointing at the isolated development Neon database.

## What CI (`.github/workflows/quality.yml`) runs

On every PR and push to `main`: install → `pnpm check` → `pnpm build` → install Chromium → `pnpm test` (Playwright) → `pnpm audit --audit-level high`. CI supplies test-only WorkOS env vars and a local Postgres `DATABASE_URL`; it does **not** run `pnpm test:server` or `pnpm test:db` unless a later workflow file adds them — check the current workflow file, since AGENTS.md's Verification section requires both before calling a slice complete, so a green CI run is not the full bar.

## Before calling anything done

Per AGENTS.md: `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:server`, `pnpm test:db`, `pnpm audit --audit-level high`. A green build proves none of: successful WorkOS authentication, a durable execution actually completing, or a production migration having run — say explicitly which of these you did or didn't verify.

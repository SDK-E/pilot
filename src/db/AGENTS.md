# AGENTS.md — Database

## Purpose

Drizzle ORM schema and client for Pilot's Postgres (Neon) database.

## Key files

- `client.ts` — the Neon HTTP driver client used at runtime (`drizzle-orm/neon-http`
  via `@neondatabase/serverless`). `scripts/migrate.mts` deliberately reuses
  this same HTTP driver for production migrations rather than
  `drizzle-kit migrate`'s websocket driver — see that file's comment before
  changing either.
- `schema/` — schema split by domain (one file per area, re-exported from
  `schema/index.ts`), matching `src/<domain>/` boundaries.
- `first-row.ts` — shared helper for the "select one row or undefined"
  pattern used across repositories.
- `../../drizzle/` (repo root) — generated SQL migrations, one per
  `pnpm db:generate` run. Never hand-edit a committed migration file.

## Rules

- Schema changes: edit `schema/`, then `pnpm db:generate` to write the
  migration, then `pnpm db:migrate` against your local `.env.local`
  database, then `pnpm test:db`.
- Production migrations run only via `pnpm db:migrate:deploy`
  (`scripts/migrate.mts`) from the Vercel production build
  (`VERCEL_ENV=production`, see `vercel.json`) — never locally against a
  production `DATABASE_URL` (root AGENTS.md §Security rules).
- Every query touching conversations, projects, or attachments filters by
  `createdByWorkosUserId` — see root AGENTS.md §Security rules and the
  `workos` skill.

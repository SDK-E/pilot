# AGENTS.md — Scripts

## Purpose

One-off and deploy-time scripts, run via `tsx`, not part of the Next.js
build itself.

## Key files

- `migrate.mts` — applies pending Drizzle migrations using the same Neon
  HTTP driver as `src/db/client.ts` (not `drizzle-kit migrate`'s websocket
  driver — see the file's own comment for why). Run only as
  `pnpm db:migrate:deploy`, and only from the Vercel production build
  (`VERCEL_ENV=production`, per `vercel.json`). Never run this locally
  against a production `DATABASE_URL` (root AGENTS.md §Security rules).

## Rules

- A script here must fail loudly (throw, non-zero exit) rather than
  silently no-op when required environment variables are missing —
  `migrate.mts` throws if `DATABASE_URL` is unset; follow that pattern.
- Keep scripts server-only and free of browser-facing code; they are not
  covered by the App Router's session boundary and must not read secrets
  they don't already own the environment for.

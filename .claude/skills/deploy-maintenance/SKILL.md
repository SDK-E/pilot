---
name: deploy-maintenance
description: Clean up stale Vercel preview/production deployments, or reset the local dev database back to a fresh migrated state, for this repo. Use when the user wants to prune old Vercel deployments, free up deployment slots, or wipe and re-seed their local database — not for anything touching a shared/production database.
---

# Deploy maintenance (pilot)

Two independent, both destructive-but-scoped-to-local-or-preview tools.

## Clean old deployments

`pnpm deploy:clean` (preview) / `pnpm deploy:clean:production` — runs `scripts/clean-deployments.sh <target>`:

```bash
vercel list --environment "$TARGET" --json | <extract urls> | xargs vercel remove --safe --yes
```

Removes deployments for the given environment via `vercel remove --safe` (safe mode won't remove a deployment that's the current alias target). Use this to prune accumulated preview deployments; think twice before running the `:production` variant since it operates on production deployment history, not just previews.

## Reset local database

`pnpm db:reset` runs `scripts/db-reset.mts`: drops and recreates the local Postgres `public` schema, then reapplies migrations. Requires typing the DB host back to confirm (or `CONFIRM_RESET=yes` env var to skip the prompt in non-interactive contexts).

**This is local-dev-database-only.** It refuses to proceed without the host confirmation specifically so it can't accidentally be pointed at a shared or production `DATABASE_URL` — if `.env.local` currently holds a production connection string (e.g. right after `pnpm env:pull:production`), do not run this; switch back to a local/dev database first. See [ADR references in AGENTS.md's Security rules section] for why production migrations only ever run from the Vercel build step, never locally.

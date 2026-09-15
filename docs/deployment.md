# Deployment

Vercel-specific deployment details. For local development, see
[`development.md`](development.md).

## Platform

Vercel is the target platform. Use the Next.js framework preset and
Node.js 24. WorkOS secrets are scoped per Vercel environment
(development/preview/production) and are never shared between them.

## Build and migrations

`vercel.json`:

```json
{
  "buildCommand": "if [ \"$VERCEL_ENV\" = \"production\" ]; then pnpm db:migrate:deploy; fi && pnpm build"
}
```

- `pnpm db:migrate:deploy` (`scripts/migrate.mts`) runs Drizzle migrations
  using the same Neon HTTP driver as `src/db/client.ts`
  (`drizzle-orm/neon-http`), not `drizzle-kit migrate`'s websocket driver —
  the Vercel build sandbox does not reliably permit outbound websocket
  connections, which made `drizzle-kit migrate` exit inconsistently without
  actually applying the pending migration.
- This step runs **only** when `VERCEL_ENV=production`. Preview builds skip
  it entirely and never touch a shared production database. Drizzle records
  applied migrations, so a later production build does not reapply them.
- Never pull a production `DATABASE_URL` locally to run migrations by hand.

## Neon (per-environment databases)

Development, preview, and production each get separate Neon database
credentials. `DATABASE_URL` (and `DATABASE_URL_UNPOOLED` where used) must
never be shared across environments. Local development and `pnpm test:db`
use the development database only.

## OIDC to the Pilot AI runtime

Pilot calls the separate Pilot AI runtime with a Vercel OIDC token:
`src/ai/pilot-ai-client.ts` obtains one via `getVercelOidcToken()`
(`@vercel/oidc`) and sends it as `x-pilot-runtime-oidc-token` plus
`x-vercel-trusted-oidc-idp-token`. Runtime callbacks back into Pilot
(`/api/runtime/*`) are service-to-service endpoints authenticated the other
direction, via a WorkOS M2M token (`src/ai/workos-m2m.ts`) — see
`.claude/skills/workos/SKILL.md` and
[ADR-0017](decisions/0017-workos-m2m-runtime-auth.md).

## Vercel Blob and Vercel Sandbox

- Private conversation attachments and project files are stored in Vercel
  Blob (`src/files/`), served only after a WorkOS session check, and never
  made public.
- The `code-sandbox` tool provisions a fresh Vercel Sandbox
  (`@vercel/sandbox`) per call, isolated from Pilot's own systems, secrets,
  and data. Provisioning it needs Vercel's own OIDC or a `VERCEL_TOKEN`
  fallback and has no local equivalent. See
  `.claude/skills/vercel/SKILL.md`.

## Running elsewhere

The app can run with `pnpm build && pnpm start` on another Node host, but
authentication currently depends on WorkOS, and the migration/OIDC/Sandbox
behavior above is Vercel-specific.

## Status

Do not treat the current state as production-ready. Track remaining work
and provisioning verification in [`progress.md`](progress.md).

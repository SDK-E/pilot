# pilot-ai moves from Vercel to Render

Status: implemented on 2026-09-18/19.

## Context

pilot-ai's `/api/v1/chat/completions` was hitting
`Vercel Runtime Timeout Error: Task timed out after 300 seconds` in
production. ADR-0026 gives pilot's own browser-facing route a way to work
around a hard request-lifetime ceiling by deferring and auto-resuming — but
it only works around the ceiling, it doesn't remove it, and pilot-ai's own
compute was still bounded by Vercel's Hobby-plan 300s limit no matter what
pilot-ai's code did. Mastra's own docs recommend a standalone Hono server
(`mastra build`'s non-serverless output) on any Node-compatible host
"when you need full control over your infrastructure, long-running
processes, or WebSocket connections" — exactly this situation.

Scope: pilot-ai only. Pilot itself stays on Vercel — Vercel Blob storage,
the Vercel Sandbox tool, and the OIDC-based identity handshake are all
Vercel-specific and not worth unwinding for this, and ADR-0026's chunking
already gives pilot's own browser-facing route a working, if imperfect,
answer to the same ceiling.

## Decision

Four changes made pilot-ai Render-portable:

1. **Edge Config → a Render Key Value (Redis) store.**
   `feature-flags.ts`'s `webSearchEnabled`/`codeSandboxEnabled`/
   `connectorsEnabled` circuit breakers exist specifically to sit outside
   Pilot's own database as an independent security boundary (AGENTS.md,
   ADR-0024) — that property had to survive the move. `pilot-ai-flags`, a
   free-tier Render Key Value instance in Frankfurt, replaces Vercel Edge
   Config as the same kind of "toggle without a redeploy, independent of
   Pilot's own database" store, read via `PILOT_FEATURE_FLAGS_REDIS_URL`.
2. **`@vercel/sandbox` → E2B for the code-sandbox tool.** Vercel Sandbox's
   own docs describe it as auto-authenticating via `VERCEL_OIDC_TOKEN` only
   when the caller runs on Vercel itself; off Vercel it needs an explicit
   personal-access-token/team/project triple with no equivalent for a
   third-party host. Rather than carry that as Render-specific
   configuration, `sandbox-run.ts` now uses `e2b` — a dependency this
   codebase already described in AGENTS.md's own product-model section
   ("The sandbox runs each call in a fresh E2B sandbox"), so this change
   brings the code in line with what the docs already said.
3. **Vercel-issued OIDC as a secondary identity signal, removed.**
   `skill-preflight.ts` and `runtime-selection.ts` no longer assume
   `VERCEL_OIDC_TOKEN` is available; skill-marketplace preflight is a
   best-effort step that simply skips when it's unset (as it always will be
   off Vercel) rather than failing the turn. The pilot↔pilot-ai auth
   boundary itself was never OIDC-based — it already ran on WorkOS M2M
   client-credentials (ADR-0017) — so nothing about that boundary changed.
4. **`vercel.json` and its `maxDuration` config, deleted.** Render has no
   equivalent per-request ceiling to configure.

Separately, pilot-ai's runtime storage moved from Turso (LibSQL) to Neon
Postgres (`@mastra/pg`) and the Vercel-specific serverless entrypoints under
`api/v1/*.ts` (superseded by Mastra's own standalone Hono server) were
deleted, along with the Vercel-only skill docs and deploy scripts that no
longer apply.

Two Render web services run from the `SDK-E/pilot-ai` GitHub repo, Frankfurt
region, free plan, auto-deploying on every push to `main`: `pilot-ai`
(production, `https://pilot-ai-gdbs.onrender.com`) and `pilot-ai-preview`.
`pilot/src/ai/pilot-ai-client.ts`'s `PILOT_AI_RUNTIME_URL` simply points at
the Render URL instead of the old Vercel one — no other change was needed
on pilot's side.

## Consequences

- pilot-ai's own compute is no longer bounded by a 300s ceiling at all; a
  genuinely long-running multi-step Work/Code turn now completes without
  ADR-0026's chunking needing to intervene on pilot-ai's side of the call.
  ADR-0026's mechanism remains in place and load-bearing for pilot's own
  Vercel-side browser-facing route, which did not move.
- Render's free-tier web service spins down after 15 minutes idle — the
  next request after idle pays a cold-start cost, but no in-flight request
  is ever cut off by it, unlike Vercel's hard mid-request ceiling.
- Confirmed via WorkOS M2M token mint + a direct authenticated call to
  `/v1/chat/completions`, and via the Render dashboard's own deploy status,
  that both services build, deploy, and serve traffic on Render at the
  current `main` commit.

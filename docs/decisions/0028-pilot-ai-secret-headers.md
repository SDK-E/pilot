# pilot-ai's remaining secret env vars move to platform_secrets

Status: implemented on 2026-09-18.

## Context

ADR-0024 moved every rotatable, admin-managed pilot secret off env vars and
into `platform_secrets`. Two survived in pilot-ai itself:
`LANGSEARCH_API_KEY` (required — gates web search entirely when absent) and
`GITHUB_TOKEN` (optional — raises pilot-ai's unauthenticated GitHub
rate limit). Both are exactly the kind of "used to be an env var" value
ADR-0024 already generalized a mechanism for; leaving them in pilot-ai's own
environment would have meant a Render redeploy to rotate either one, and a
second, inconsistent place to look for platform secrets.

## Decision

Add `langsearchApiKey`/`githubToken` to `PLATFORM_SECRET_FIELDS`
(`src/app/admin/connector-providers/page.tsx`) — per ADR-0024's own design,
this needed zero new form or action code. `pilot-ai-client.ts`'s
`runtimeHeaders()` resolves them alongside the existing gateway-credential
headers and forwards them as `x-pilot-langsearch-api-key`/
`x-pilot-github-token`, sent only when set. `langsearch.ts`/
`github-public.ts` on the pilot-ai side read the header first; since
pilot-ai never runs without pilot in front of it, the env var fallback was
dropped outright rather than kept as a "local dev convenience" — there is
no deployment where pilot-ai receives real traffic without pilot's header
attached.

Deliberately untouched: pilot-ai's `webSearchEnabled`/`codeSandboxEnabled`/
`connectorsEnabled` circuit breakers stay Redis-backed and independent of
Pilot's own database (AGENTS.md) — a different boundary, not a gap this
closes.

## Consequences

- Rotating either key is now an admin-panel edit, no redeploy.
- pilot-ai has one fewer required env var (`LANGSEARCH_API_KEY`) at deploy
  time on Render — one less thing to get wrong wiring up a new environment.

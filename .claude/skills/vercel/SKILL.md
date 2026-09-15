---
name: vercel
description: Use when working on pilot's deployment config, Vercel Blob file storage, the Vercel OIDC token flow to the pilot-ai runtime, or the code-sandbox tool (Vercel Sandbox).
---

# Vercel setup (pilot)

## Deployment

- `vercel.json`: `buildCommand` runs `pnpm db:migrate:deploy` (only when `VERCEL_ENV=production`) and then `pnpm build`. Production migrations only ever run from this Vercel production build step — never locally against a production `DATABASE_URL` (AGENTS.md §Security).
- Preview builds skip the migration step and do not touch a shared production database.
- Framework preset: Next.js, Node.js 24.

## Vercel Blob (private files)

Used for conversation attachments and project files — see `src/files/private-file-response.ts`, `src/files/delete-blob-quietly.ts`, `src/conversations/attachment-context.ts`, and the upload routes under `src/app/api/conversations/[conversationId]/attachments/route.ts` and `src/app/api/projects/[projectId]/files/route.ts`. Files are private per creator (`createdByWorkosUserId`), served only after a session check, never made public.

## OIDC to the pilot-ai runtime

- `src/ai/pilot-ai-client.ts` gets a short-lived token via `getVercelOidcToken()` (`@vercel/oidc`) and sends it as `x-pilot-runtime-oidc-token` plus `x-vercel-trusted-oidc-idp-token`. No long-lived bypass secret is ever added for this (see `.env.example` comment on `PILOT_AI_RUNTIME_URL`).
- Runtime callbacks back into pilot (`/api/runtime/*`) instead verify a WorkOS M2M token (see the `workos` skill) — the two directions use different credentials, don't conflate them.

## Code sandbox tool

- The `code-sandbox` tool (`src/agents/agent-tools.ts`) runs each call in a fresh Vercel Sandbox (`@vercel/sandbox`) with no access to Pilot's own systems, secrets, or data.
- Gated on pilot's side by the organization's `codeSandboxEnabled` preference (`src/organizations/organization-preference-repository.ts`, editable from Settings, no deploy needed) and independently by pilot-ai's own `PILOT_ENABLE_CODE_SANDBOX` env flag as a platform-level circuit breaker.
- Provisioning an actual sandbox needs Vercel's own OIDC or a `VERCEL_TOKEN` fallback and has no local equivalent — that's `@vercel/sandbox` authenticating to Vercel itself, a separate concern from the pilot↔pilot-ai OIDC/M2M boundary above.

## Reference files

`vercel.json`, `scripts/migrate.mts`, `src/ai/pilot-ai-client.ts`, `docs/decisions/0011-private-chat-attachments.md`, `docs/decisions/0017-workos-m2m-runtime-auth.md`.

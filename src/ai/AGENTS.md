# AGENTS.md — AI Integration

## Purpose

`pilot/src/ai/` contains Pilot's authenticated client to the Pilot AI runtime.

## Key files

- `src/ai/pilot-ai-client.ts` — Server-only client for `/v1/chat/completions`, `/v1/approvals/resume`, cleanup, and streaming via OIDC token from `@vercel/oidc`
- `src/ai/pilot-runtime-oidc.test.ts` — OIDC verification test

## Rules

- This file is `server-only` — never imported into client components.
- OIDC token obtained via `getVercelOidcToken()`; sent in `x-pilot-runtime-oidc-token` + `x-vercel-trusted-oidc-idp-token` headers.
- `@pilot/conversation-contracts` import is BLOCAC pending npm publication (see ADR 0013); in-repo DTO retained as TODO.
- All requests to the runtime must be scoped to the authenticated organization and worker.

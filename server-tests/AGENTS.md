# AGENTS.md — Server tests

## Purpose

Tests that must run under React Server Component module conditions
(`NODE_OPTIONS='--conditions=react-server'`), separate from the plain
`tests/*.test.ts` suite. Currently `pilot-ai-stream.test.ts`, exercising the
runtime stream parser (`src/ai/runtime-stream.ts`).

## Rules

- Run via `pnpm test:server`, which lists every included file explicitly in
  `package.json` (this file plus several `tests/*.test.ts` and
  `src/ai/workos-m2m.test.ts`) — a new server-conditions test must be added
  to that script's file list or it never runs.
- A test belongs here instead of `tests/` only if it imports something that
  resolves differently under the `react-server` condition (e.g. server-only
  runtime/client code) — otherwise put it in `tests/`.
- Register cases with `test(...)` from `node:test`, matching `tests/AGENTS.md`'s
  conventions. Never print or commit credentials.

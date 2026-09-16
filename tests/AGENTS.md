# AGENTS.md — Tests

## Test locations

- `tests/*.spec.ts` — Playwright checks of the public page and every
  unauthenticated boundary (`pnpm test`; needs a fresh `pnpm build`).
- `tests/unit/*.test.ts` — Pure unit tests, no DB, auto-discovered by
  `pnpm test:server` (along with `server-tests/` and `src/ai/`).
- `tests/integration/*.test.ts` — Neon-backed tests, auto-discovered by
  `pnpm test:db` (needs `.env.local` with the development database).
- `server-tests/` — The runtime stream parser under `--conditions=react-server`.
- `tests/helpers/` — Shared helpers for the Playwright specs.
- `pilot-ai/src/**/*.test.ts` — Runtime tests (vitest).

A new test file placed in `tests/unit/` or `tests/integration/` runs
automatically — `test:server`/`test:db` glob-discover, they don't list
files by name. Don't add a file matching `*.test.ts` to `tests/unit/` or
`tests/integration/` unless you mean for it to run in that suite.

## Conventions

- Register node:test cases with `test(...)`; the ESLint config knows the
  returned promise is intentionally unawaited.
- Narrow before asserting: `assert.ok(row)` then use `row`, rather than
  optional chains inside assertions.
- Authenticated browser flows have no fixture yet. Do not add skipped
  placeholder tests for them; record the gap in `docs/progress.md` instead.

## Rules

- Never print or commit credentials in tests.
- `test:db` uses the isolated development Neon database and removes its
  randomized fixtures.
- A test not executed by CI does not close a gate.

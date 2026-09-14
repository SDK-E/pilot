# AGENTS.md — Tests

## Test locations

- `tests/*.spec.ts` — Playwright checks of the public page and every
  unauthenticated boundary (`pnpm test`; needs a fresh `pnpm build`).
- `tests/*.test.ts` — Pure unit tests run with node:test (`pnpm test:server`).
- `tests/*.integration.test.ts` — Neon-backed tests (`pnpm test:db`; needs
  `.env.local` with the development database).
- `server-tests/` — The runtime stream parser under `--conditions=react-server`.
- `tests/helpers/` — Shared helpers for the Playwright specs.
- `pilot-ai/src/**/*.test.ts` — Runtime tests (vitest).

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

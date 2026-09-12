# AGENTS.md — Tests

## Test locations

- `pilot/tests/` — Domain integration tests (worker-repository, auth-boundary, research, etc.)
- `pilot/server-tests/` — Server-side runtime tests (OIDC, stream parsing)
- `pilot-ai/src/**/*.test.ts` — Runtime unit/integration tests (vitest)

## Conventions

- Browser tests: Playwright (anonymous boundary tests)
- Server tests: node:test via tsx --test with --conditions=react-server
- Runtime tests: vitest run
- Credential-dependent tests must be marked BLOCKED with stated condition

## Rules

- Never print or commit credentials in tests.
- test:db uses isolated development Neon and removes randomized fixtures.
- A test not executed by CI does not close a gate.

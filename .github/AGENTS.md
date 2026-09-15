# AGENTS.md — GitHub configuration

## Purpose

CI workflows and repository community files (issue/PR templates).

## What CI expects

`workflows/quality.yml` runs on every pull request and push to `main`:
install (frozen lockfile) → `pnpm check` → `pnpm build` → install Chromium →
`pnpm test` (Playwright) → `pnpm audit --audit-level high`, plus separate
`pnpm test:server` / `pnpm test:db` coverage (see that workflow file for the
current jobs, and the `dev-workflow` skill for what each command checks).
It supplies test-only WorkOS environment variables and a local Postgres
`DATABASE_URL` — never point CI at a real WorkOS environment or a Neon
database that isn't explicitly provisioned for it via a repo secret.

## Rules

- A change that adds a new required local check (a new lint rule, a new
  test script) must also update `workflows/quality.yml`, or CI stops
  reflecting what `AGENTS.md` §Verification actually requires.
- `test:db` needs a real Postgres connection; any CI job running it must be
  gated on a repo secret being present (e.g. `DATABASE_URL_TEST`) and skip
  cleanly, not fail, when the secret is absent (relevant for forked-repo
  PRs, which never receive secrets).
- Issue/PR templates under `ISSUE_TEMPLATE/` and
  `PULL_REQUEST_TEMPLATE.md` should stay in sync with `CONTRIBUTING.md`'s
  required-checks list.

# Contributing to Pilot

This is a proprietary SDK-E project (see [`LICENSE`](LICENSE)). This guide is
for people with repo access working on it.

## Branch and PR flow

1. Branch from `main`.
2. Make your change, following the conventions in [`AGENTS.md`](AGENTS.md)
   (product model, code layout, security rules) and the domain-specific
   `AGENTS.md` files under `src/`, `docs/`, `tests/`, `.github/`, etc.
3. Run the full check list below before opening a PR.
4. Open a PR against `main` using the pull request template. Keep PRs scoped
   to one change; note anything you couldn't verify (see
   [`docs/development.md`](docs/development.md)) rather than silently
   skipping it.
5. `.github/workflows/quality.yml` runs on every PR; all required checks
   must pass before merge.

## Required checks before opening a PR

```sh
pnpm check       # lint + typecheck + format:check + knip
pnpm build
pnpm test        # Playwright
pnpm test:server # node:test unit tests
pnpm test:db     # Neon-backed integration tests (needs .env.local)
pnpm audit --audit-level high
```

See [`docs/development.md`](docs/development.md) for environment setup and
what each of these actually verifies (and doesn't).

## Code style

- ESLint is fully strict — `pnpm exec eslint .` must report zero problems.
  `tsc --noEmit`, `knip`, and `prettier --check` must also be clean
  (`pnpm check` runs all four).
- Keep files under 300 lines and functions under 60 lines (150 lines for
  React components and hooks).
- Every rule override in `eslint.config.mjs` carries a comment saying why.
- Never hand-edit `src/components/ui/` or `src/components/ai-elements/`
  (vendored, lint-ignored) — see `.claude/skills/shadcn/SKILL.md` and
  `.claude/skills/ai-elements/SKILL.md`.

## Security

Every page, Server Action, and API route must start with
`getWorkspaceSession()`/`requireWorkspaceSession()`; a new authenticated
route must be added to `src/proxy.ts`'s matcher. Conversations, projects,
and attachments are creator-scoped by `createdByWorkosUserId`. See
`AGENTS.md` §Security rules and `.claude/skills/workos/SKILL.md` before
touching auth-adjacent code.

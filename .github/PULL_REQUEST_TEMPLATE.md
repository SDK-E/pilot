## Summary

<!-- What changed and why. Link an issue or ADR if relevant. -->

## Checks run

- [ ] `pnpm check` (lint + typecheck + format:check + knip)
- [ ] `pnpm build`
- [ ] `pnpm test` (Playwright)
- [ ] `pnpm test:server`
- [ ] `pnpm test:db`
- [ ] `pnpm audit --audit-level high`

Note here anything you couldn't run and why (e.g. no Neon access, no
browser install) — see [`docs/development.md`](../docs/development.md).

## Security-relevant changes

- [ ] N/A
- [ ] Touches auth, session checks, or `src/proxy.ts` — new routes added to
      the matcher, boundary tests included
- [ ] Touches creator-scoped data (conversations/projects/attachments) —
      queries still filter by `createdByWorkosUserId`

## Docs

- [ ] Updated `docs/progress.md` "Current state" if this changes
      implementation status
- [ ] Added/updated an ADR under `docs/decisions/` if this is an
      architectural decision

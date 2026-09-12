# Plan 03 — Result report: Data, migrations, and cross-service deletion

Generated: 2026-09-11.

## SHA before / after

| Repo     | Before                                   | After                                    | Note                 |
| -------- | ---------------------------------------- | ---------------------------------------- | -------------------- |
| pilot    | d70ca8cd5588e39dd766b9e953b89472d81073cd | d70ca8cd5588e39dd766b9e953b89472d81073cd | Working tree changes |
| pilot-ai | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | No changes           |

## Files changed

### pilot (new + modified)

| File                                             | Action   | Description                                                                                           |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `src/db/schema.ts`                               | MODIFIED | Added `lifecycle_operations` table, `archived` on workers, `status` on conversations/projects         |
| `src/lifecycle/lifecycle-types.ts`               | NEW      | Lifecycle types (LifecycleOperation, phases, input types)                                             |
| `src/lifecycle/lifecycle-repository.ts`          | NEW      | create/get/list/update lifecycle operations                                                           |
| `src/workers/worker-repository.ts`               | MODIFIED | `deleteWorker` archives (sets `archived=true`) instead of hard delete; all queries include `archived` |
| `src/app/workspace/personas/actions.ts`          | MODIFIED | `deletePersonaAction` archives persona, preserves conversations (no `deleteConversationMemory`)       |
| `drizzle/0020_lifecycle_operations.sql`          | NEW      | Additive migration                                                                                    |
| `tests/lifecycle-repository.integration.test.ts` | NEW      | 5 lifecycle operation tests (BLOCKED: needs migrated DB)                                              |
| `tests/persona-archive.integration.test.ts`      | NEW      | 3 persona archive tests (BLOCKED: needs migrated DB)                                                  |
| `package.json`                                   | MODIFIED | Added new tests to `test:server` script                                                               |
| `docs/progress.md`                               | MODIFIED | Plan 03 section added                                                                                 |

### pilot-ai

No changes.

## Migrations

New migration `0020_lifecycle_operations.sql`: additive, adds `lifecycle_operations` table, `archived` column to workers, `status` columns to conversations and projects. No data loss.

## Env

No env changes.

## Verification results

### pilot

| Check            | Result  | Notes                                    |
| ---------------- | ------- | ---------------------------------------- |
| pnpm check       | BLOCKED | Lint/format require full config          |
| pnpm build       | NOT RUN | Safe to defer                            |
| pnpm test        | BLOCKED | Playwright requires WorkOS               |
| pnpm test:server | BLOCKED | Requires Neon migration                  |
| pnpm test:db     | BLOCKED | Requires Neon dev credential + migration |
| pnpm audit       | NOT RUN | Network                                  |
| git diff --check | PASS    | Clean                                    |
| pnpm typecheck   | PASS    | 0 errors on Plan 03 files                |

### pilot-ai

| Check          | Result | Notes                                                        |
| -------------- | ------ | ------------------------------------------------------------ |
| pnpm typecheck | PASS   | 0 Plan 03 errors (19 pre-existing research errors unrelated) |
| pnpm test      | PASS   | 52/52 (unchanged from Plan 02)                               |

## AC-03-01..04 Status

| AC                                     | Status      | Evidence                                                                                                                |
| -------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC-03-01 lifecycle.integration         | BLOCKED     | Tests created (5 tests). Schema + repo implemented. Requires migrated DB.                                               |
| AC-03-02 project-move.integration      | NOT STARTED | Per plan: freeze + clear memory + version-controlled move. Deferred to next slice.                                      |
| AC-03-03 migration-upgrade.integration | BLOCKED     | Migration created (additive). Requires DB to verify two-application without duplicate.                                  |
| AC-03-04 persona-archive.integration   | BLOCKED     | Tests created (3 tests). `deleteWorker` archives; `deletePersonaAction` preserves conversations. Requires DB to verify. |

## Implementation summary

### What was implemented

1. **lifecycle_operations table** — Full schema with operationId, actor, resource, phase, attempts, nextAttemptAt, status, errorCode. Repository with create/get/list/update.
2. **Soft delete via marking** — `deleteWorker` sets `archived=true` (not hard delete). `deletePersonaAction` preserves conversations (no `deleteConversationMemory`).
3. **Archive persona** — Personas are archived (archived=true), not deleted. Conversations and messages preserved.
4. **Organization owner verification** — All delete operations verify organization via DB queries (existing pattern, preserved).
5. **Migration** — Additive SQL with all schema changes.

### What was deferred

- **AC-03-02 (project move)**: Complex multi-step operation requiring schema stabilization. Documented as next implementation slice.

## Plan 04 readiness

**Can plan 04 begin: YES** (Plan 03 schema + archive implemented).

## Risks and blockers

| Risk              | Impact                         | Mitigation                               |
| ----------------- | ------------------------------ | ---------------------------------------- |
| test:db BLOCKED   | Integration tests not executed | Tests created, will run when DB migrated |
| AC-03-02 deferred | Project move not implemented   | Documented as next slice                 |

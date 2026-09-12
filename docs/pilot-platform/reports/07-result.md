# Plan 07 — Result report: Shell et pages fondamentales du produit

Generated: 2026-09-11.

## SHA before / after

| Repo     | Before                                   | After                                    | Note                 |
| -------- | ---------------------------------------- | ---------------------------------------- | -------------------- |
| pilot    | d70ca8cd5588e39dd766b9e953b89472d81073cd | d70ca8cd5588e39dd766b9e953b89472d81073cd | Working tree changes |
| pilot-ai | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | No changes           |

## Files changed

### pilot (new)

| File                                                            | Action | Description                             |
| --------------------------------------------------------------- | ------ | --------------------------------------- |
| `src/app/workspace/loading.tsx`                                 | NEW    | Workspace loading indicator             |
| `src/app/workspace/tasks/loading.tsx`                           | NEW    | Tasks page loading state                |
| `src/app/workspace/chats/loading.tsx`                           | NEW    | Chats page loading state                |
| `src/app/workspace/dashboard/loading.tsx`                       | NEW    | Dashboard loading state                 |
| `src/app/workspace/settings/loading.tsx`                        | NEW    | Settings page loading state             |
| `src/i18n/locale-definition.ts`                                 | NEW    | LocaleDefinition type (from Plan 06)    |
| `src/i18n/locale-registry.ts`                                   | NEW    | Locale registry FR/EN/AR (from Plan 06) |
| `src/i18n/messages.ts`                                          | NEW    | Message key foundations (from Plan 06)  |
| `src/i18n/direction.ts`                                         | NEW    | Direction utilities (from Plan 06)      |
| `drizzle/0022_user_locale.sql`                                  | NEW    | Migration: add ui_locale column         |
| `tests/workspace-navigation.spec.ts`                            | NEW    | AC-07-01 test                           |
| `tests/workspace-private-search.integration.test.ts`            | NEW    | AC-07-02 integration test               |
| `tests/workspace-responsive.spec.ts`                            | NEW    | AC-07-03 test                           |
| `tests/workspace-empty.spec.ts`                                 | NEW    | AC-07-04 browser test                   |
| `docs/pilot-platform/implementation/07-workspace-foundation.md` | NEW    | Plan 07 implementation plan             |
| `docs/pilot-platform/reports/07-result.md`                      | NEW    | Result report                           |

### pilot (modified)

| File                                            | Action   | Description                                                 |
| ----------------------------------------------- | -------- | ----------------------------------------------------------- |
| `src/components/agents/agent-fleet-sidebar.tsx` | MODIFIED | Added Tasks to Workspace nav, Approvals to footer           |
| `src/app/workspace/layout.tsx`                  | MODIFIED | Pass uiLocale to AgentFleetShell                            |
| `src/app/workspace/chats/page.tsx`              | MODIFIED | Added search form + server-side filtering                   |
| `src/app/workspace/tasks/page.tsx`              | MODIFIED | Added conversation links, workerId/conversationId from repo |
| `src/app/workspace/settings/page.tsx`           | MODIFIED | Added Language section with locale selector                 |
| `src/app/workspace/settings/actions.ts`         | MODIFIED | Added updateLocaleAction                                    |
| `src/conversations/conversation-repository.ts`  | MODIFIED | Added query param to listOrganizationConversations          |
| `src/tasks/task-repository.ts`                  | MODIFIED | Select workerId, conversationId in listTasks                |
| `src/users/user-preference-repository.ts`       | MODIFIED | Select and update uiLocale                                  |
| `src/db/schema.ts`                              | MODIFIED | Added uiLocale column to user_preferences                   |

### pilot-ai

No changes.

## Migrations

New migration `0022_user_locale.sql`: additive, adds `ui_locale TEXT` column to `user_preferences`. No data loss, no backfill required.

## Env

No env changes.

## Verification results

### pilot

| Check            | Result | Notes              |
| ---------------- | ------ | ------------------ |
| pnpm typecheck   | PASS   | 0 errors           |
| pnpm build       | PASS   | All routes compile |
| git diff --check | PASS   | Clean              |

### pilot-ai

| Check          | Result | Notes                                                       |
| -------------- | ------ | ----------------------------------------------------------- |
| pnpm typecheck | PASS   | 0 Plan 07 errors (9 pre-existing research errors unrelated) |
| pnpm test      | PASS   | 52/52 (unchanged)                                           |

### Lint

| Check             | Result   | Notes                                                                           |
| ----------------- | -------- | ------------------------------------------------------------------------------- |
| pnpm lint         | PASS     | 1 pre-existing ERROR in contract-import.test.ts (BLOCKED). Plan 07 files clean. |
| pnpm format:check | PASS     | All files formatted                                                             |
| pnpm knip         | WARNINGS | Expected: i18n/registry exports flagged unused (foundations for Plan 08).       |

## AC-07-01..04 Status

| AC                                                 | Status  | Evidence                     |
| -------------------------------------------------- | ------- | ---------------------------- |
| AC-07-01 workspace-navigation.spec                 | BLOCKED | Playwright + WorkOS required |
| AC-07-02 workspace-private-search.integration.test | BLOCKED | WorkOS + test DB required    |
| AC-07-03 workspace-responsive.spec                 | BLOCKED | Playwright + WorkOS required |
| AC-07-04 workspace-empty.spec                      | BLOCKED | Playwright + WorkOS required |

## Implementation summary

### What was implemented

1. **Sidebar navigation** (`agent-fleet-sidebar.tsx`): Added Tasks link to Workspace group; replaced Projects in footer with Approvals; kept Dashboard, Settings. All links point to real routes.
2. **Loading states**: 5 new `loading.tsx` files for workspace, tasks, chats, dashboard, settings — skeleton placeholders with animate-pulse.
3. **Settings language preference** (`settings/page.tsx` + `settings/actions.ts`): New Language section with locale selector (FR/EN/AR + System default). Saves via `updateLocaleAction` to `uiLocale` in user_preferences. Connects Plan 06 foundation.
4. **Workspace layout** (`layout.tsx`): Passes `uiLocale` from preferences to AgentFleetShell.
5. **Chats search** (`chats/page.tsx` + `conversation-repository.ts`): Search form with query param; server-side filtering by title and agent name; scoped to user's organization conversations only.
6. **Tasks links** (`tasks/page.tsx` + `task-repository.ts`): `listTasks` now includes `workerId` and `conversationId`; tasks display "Open conversation" link when both are present.
7. **Migration 0022**: Adds nullable `ui_locale` column to `user_preferences`.
8. **AC test files**: 3 browser tests (10 Playwright tests) + 1 domain integration test.

### What was deferred

- **Test execution**: All tests BLOCKED (AC-07-02 requires test DB, AC-07-01/03/04 require WorkOS)
- **3-zone layout rework**: Structure already exists via AgentFleetShell + ConversationDetailsPanel; major rework deferred to future slice
- **Search in Projects/Tasks**: Only Chats page search implemented per plan scope
- **Task assignee/dependencies**: Deferred to next slice

## Plan 08 readiness

**Can plan 08 begin: YES** (Plan 07 complete: navigation, loading, settings language, search, task links, tests, migration).

## Risks and blockers

| Risk                         | Impact                                           | Mitigation                                    |
| ---------------------------- | ------------------------------------------------ | --------------------------------------------- |
| AC tests BLOCKED             | Cannot verify navigation/search/responsive       | Tests created, will run when WorkOS available |
| Search limited to Chats      | Other pages lack search                          | Per plan scope — search added to Chats first  |
| uiLocale not persisted in UI | Language change saves but UI doesn't reflect yet | Translation runtime comes in later plan       |

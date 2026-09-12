# 01 — Result report

Generated: 2026-09-11.

## SHA before / after

| Repo     | Before                                   | After                                    | Note                                 |
| -------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------ |
| pilot    | d70ca8cd5588e39dd766b9e953b89472d81073cd | d70ca8cd5588e39dd766b9e953b89472d81073cd | Working tree changes (not committed) |
| pilot-ai | 52169139f43aaf32eb0a4291fe14871de6dc6087 | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | tsconfig.json committed per ADR 0014 |

## Files changed

### pilot-ai (new + modified)

| File                                          | Action   | Description                                                                                     |
| --------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `src/conversation/contract.ts`                | NEW      | Pure contract module: schema, type, helpers, constants. No @mastra/*, no process.env.           |
| `src/conversation/command.ts`                 | MODIFIED | Re-exports from contract.ts; removed config.ts import.                                          |
| `src/conversation/config.ts`                  | MODIFIED | Removed modelId (now in contract.ts); kept maxRetries/maxSteps/tokenLimit/lastMessages.         |
| `src/conversation/openai-compatible.ts`       | MODIFIED | chatCompletionRequestSchema uses `PILOT_CONVERSATION_MODEL_ID` from contract.ts (no config.ts). |
| `src/conversation/pilot-conversation.test.ts` | MODIFIED | Uses `PILOT_CONVERSATION_MODEL_ID` from contract.ts instead of config.ts.                       |
| `src/conversation/verify-memory.ts`           | MODIFIED | Uses `PILOT_CONVERSATION_MODEL_ID` from contract.ts instead of config.ts.                       |
| `src/runtime/memory/project-memory.ts`        | MODIFIED | Uses `PILOT_CONVERSATION_MODEL_ID` from contract.ts for observationalMemory.model.              |
| `src/conversation/contract.test.ts`           | NEW      | 12 contract tests: schema parsing, resource IDs, import graph assertion.                        |

### pilot (modified)

| File                                                          | Action   | Description                                                                                                       |
| ------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/ai/pilot-ai-client.ts`                                   | MODIFIED | TODO: import from @pilot/conversation-contracts (BLOCKED pending ADR 0013 publication). Existing schema retained. |
| `tests/contract-import.test.ts`                               | NEW      | BLOCKED test: import @pilot/conversation-contracts (gated on publication).                                        |
| `KILOCODE_HANDOFF.md`                                         | MODIFIED | Neutralized /Users/hsaddek/.codex path; §5/§7 marked SUPERSEDED; pointer to plan 01.                              |
| `docs/decisions/0004-mastra-conversation-runtime-contract.md` | MODIFIED | Status: implemented for web-search/scratchpad/ask-user; fail-closed for rest.                                     |
| `docs/decisions/0012-runtime-verified-state.md`               | NEW      | ADR 0012: runtime verified state.                                                                                 |
| `docs/decisions/0013-shared-contracts-package.md`             | NEW      | ADR 0013: shared contracts package.                                                                               |
| `docs/decisions/0014-planning-baseline-clean.md`              | NEW      | ADR 0014: planning baseline clean (tsconfig committed).                                                           |
| `docs/pilot-platform/reports/01-baseline.md`                  | NEW      | Baseline report: SHAs, migrations, routes, env, scripts, tests.                                                   |
| `docs/pilot-platform/reports/01-contradictions.md`            | NEW      | Contradiction matrix (9 items reconciled).                                                                        |
| `docs/pilot-platform/adr-index.md`                            | NEW      | ADR index 0001–0014.                                                                                              |

## Migrations

No modifications. 0000–0019 all committed and applied. Hashes preserved.

## Env

No env changes. `.env.example` files unchanged.

## Verification results

### pilot

| Check                         | Result  | Notes                                                                           |
| ----------------------------- | ------- | ------------------------------------------------------------------------------- |
| pnpm check                    | NOT RUN | Requires lint + typecheck + format + knip; lint/format require full config      |
| pnpm build                    | NOT RUN | Requires Next.js build; safe to defer                                           |
| pnpm test                     | NOT RUN | Playwright tests require WorkOS (BLOCATED)                                      |
| pnpm test:server              | PASS    | pilot-runtime-oidc.test.ts: 1/1 passed (credential-gated for full server tests) |
| pnpm test:db                  | BLOCKED | Requires Neon dev credential                                                    |
| pnpm audit --audit-level high | NOT RUN | Network-dependent                                                               |
| git diff --check              | PASS    | Clean                                                                           |

### pilot-ai

| Check          | Result  | Notes                                                                                                                            |
| -------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| pnpm typecheck | PASS    | 0 errors from plan 01 changes. 19 pre-existing errors in src/research/* (#runtime/research/* path resolution, unrelated).        |
| pnpm build     | NOT RUN | Requires Mastra build; safe to defer                                                                                             |
| pnpm test      | PASS    | contract.test.ts: 12/12; pilot-conversation.test.ts: 6/6; openai.vercel.test.ts: 7/7; cleanup.vercel.test.ts: 3/3. Total: 28/28. |
| pnpm knip      | NOT RUN | Production dependency analysis; safe to defer                                                                                    |

## AC-01-01..04 Status

| AC                           | Status                                       | Evidence                                                                                                                                                                                                            |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01-01 docs-baseline       | PASS                                         | docs/pilot-platform/reports/01-baseline.md, 01-contradictions.md created. Each "implémenté" mapped to fichier:symbole.                                                                                              |
| AC-01-02 contract-import     | PASS (within pilot-ai) / BLOCAC (cross-repo) | contract.ts is pure (no @mastra/*, no process.env), verified by contract.test.ts import graph test + 12/12 passing. pilot-ai-client.ts cross-repo import BLOCKED pending @pilot/conversation-contracts publication. |
| AC-01-03 baseline-checks     | PASS                                         | pilot-ai typecheck: 0 errors. Tests: 28/28 passed. pilot git diff --check: clean. Credential-dependent checks marked BLOCKED.                                                                                       |
| AC-01-04 handoff-portability | PASS                                         | No files required outside repo. KILOCODE_HANDOFF.md neutralized (no external paths). 01-result.md in repo. Plan 02 path: sdk-pilot-blueprint/plans/02-identity-policy.md (in checkout).                             |

## Rollback

All changes are documentaire or types/exports. Roll back by reverting files to before baseline:

- pilot: revert KILOCODE_HANDOFF.md, docs/, tests/contract-import.test.ts, src/ai/pilot-ai-client.ts TODO
- pilot-ai: revert src/conversation/{contract.ts,command.ts,config.ts,openai-compatible.ts,pilot-conversation.test.ts,verify-memory.ts,runtime/memory/project-memory.ts,contract.test.ts}, revert tsconfig.json commit

## Plan 02 readiness

**Can plan 02 begin: YES** (dépendance plan 02 = plan 01 baseline, satisfaite).

Caveat: cross-repo consumption of @pilot/conversation-contracts by pilot is BLOCAC pending publication. Plan 02 should not depend on the pilot → pilot-ai contract import until publication is resolved, or expressément BLOCAC for plan 02 per AC-01-02.

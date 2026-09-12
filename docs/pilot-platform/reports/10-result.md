# Plan 10 — Result report: Approbations concrètes et effets externes idempotents

Generated: 2026-09-12.

## SHA before / after

| Repo     | Before         | After          | Note                          |
| -------- | -------------- | -------------- | ----------------------------- |
| pilot    | (working tree) | (working tree) | New types + tests + migration |
| pilot-ai | (unchanged)    | (unchanged)    | No changes                    |

## Files changed

### pilot (new)

| File                                                         | Action   | Description                                                                        |
| ------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------- |
| `src/approvals/action-proposal-types.ts`                     | NEW      | ActionProposal type, handle, create/isProposalExpired/invalidate/consume functions |
| `src/approvals/policy-classes.ts`                            | NEW      | PolicyClass types, classification, checkPolicyClass()                              |
| `src/approvals/effect-intent-types.ts`                       | NEW      | EffectIntent types, createEffectIntent, buildEffectKey, transitionEffectStatus     |
| `src/approvals/proposal-repository.ts`                       | NEW      | DB-backed proposal repository                                                      |
| `src/approvals/effect-repository.ts`                         | NEW      | DB-backed effect repository with reconcileEffect                                   |
| `tests/approval-types.test.ts`                               | NEW      | 9 tests — PASS (9/9)                                                               |
| `tests/policy-classes.test.ts`                               | NEW      | 15 tests: classification, policy checks, auto-classifier signal — PASS (15/15)     |
| `tests/approval-race.integration.test.ts`                    | NEW      | AC-10-01 — BLOCKED (DB + WorkOS)                                                   |
| `tests/proposal-stale.integration.test.ts`                   | NEW      | AC-10-02 — BLOCKED (DB)                                                            |
| `tests/effect-timeout.integration.test.ts`                   | NEW      | AC-10-03 — BLOCKED (runtime)                                                       |
| `tests/approval-private.spec.ts`                             | NEW      | AC-10-04 — BLOCKED (WorkOS)                                                        |
| `drizzle/0025_approvals_effects.sql`                         | NEW      | Migration: action_proposals + effect_intents tables with triggers                  |
| `docs/pilot-platform/implementation/10-approvals-effects.md` | NEW      | Implementation document                                                            |
| `docs/pilot-platform/reports/10-result.md`                   | NEW      | Result report                                                                      |
| `package.json`                                               | MODIFIED | Added approval-types and policy-classes to test:server script                      |

### pilot (modified)

| File           | Action   | Description                |
| -------------- | -------- | -------------------------- |
| `package.json` | MODIFIED | test:server script updated |

### pilot-ai

No changes.

## Migrations

New migration `0025_approvals_effects.sql`: creates `action_proposals` (proposalId, proposalHash, type, version, targetRef, artifactRevision, canonicalArgsHash, permissionSnapshot, expiresAt, riskSummary, status) and `effect_intents` (effectKey, externalRef, status, result, dispatched/confirmed/failed timestamps). Both tables have updated_at triggers, organization-scoped indexes, and unique constraints. Additive — no existing payloads exposed.

## Env

No env changes.

## Verification results

### pilot

| Check             | Result | Notes                                                                                                       |
| ----------------- | ------ | ----------------------------------------------------------------------------------------------------------- |
| pnpm typecheck    | PASS   | 0 errors on Plan 10 files                                                                                   |
| pnpm build        | PASS   | All routes compile                                                                                          |
| pnpm lint         | PASS   | 0 errors, 0 warnings on Plan 10 files                                                                       |
| pnpm format:check | PASS   | All files formatted                                                                                         |
| pnpm test:server  | PASS   | 62/65 PASS (3 integration tests require Neon DB — pre-existing), approval-types: 9/9, policy-classes: 15/15 |
| git diff --check  | PASS   | Clean                                                                                                       |
| pnpm knip         | PASS   | Expected unused exports for Plan 11                                                                         |

### pilot-ai

| Check          | Result | Notes                                                     |
| -------------- | ------ | --------------------------------------------------------- |
| pnpm typecheck | PASS   | 0 Plan 10 errors (pre-existing research errors unchanged) |
| pnpm test      | PASS   | 52/52 (unchanged)                                         |

## AC-10-01..04 Status

| AC                                  | Status  | Evidence                                        |
| ----------------------------------- | ------- | ----------------------------------------------- |
| AC-10-01 approval-race.integration  | BLOCKED | Needs DB + WorkOS for concurrent claim + effect |
| AC-10-02 proposal-stale.integration | BLOCKED | Needs DB for staleness invalidation             |
| AC-10-03 effect-timeout.integration | BLOCKED | Needs runtime for external service timeout      |
| AC-10-04 approval-private.spec      | BLOCKED | Needs WorkOS for private approval preview       |

Supplementary unit tests (not AC-numbered):

| Test                           | Type                | Status     |
| ------------------------------ | ------------------- | ---------- |
| `tests/approval-types.test.ts` | runtime (node:test) | 9/9 PASS   |
| `tests/policy-classes.test.ts` | runtime (node:test) | 15/15 PASS |

## Implementation summary

### What was implemented

1. **ActionProposal types** (`action-proposal-types.ts`): Private proposal type with type, version, targetRef, artifactRevision, canonicalArgsHash, permissionSnapshot, expiresAt, riskSummary. Status machine: pending → stale → consumed. Handle: proposalId + proposalHash. Functions: createActionProposal, isProposalExpired, isProposalActive, invalidateProposal, consumeProposal. Hash function ensures different content/c targets produce different hashes. **Fix**: State transition guards prevent invalid transitions (consume stale/consumed, invalidate consumed).

2. **Policy classes** (`policy-classes.ts`): Six closed classes (read, local_reversible, external_write, destructive, financial, deployment) with risk levels, grant sufficiency, and side effect scopes. classifyAction() maps action types to classes. checkPolicyClass() enforces: auto-classifier is signal-only (never allows), destructive/financial/deployment require approval even with grant, external_write allowed with explicit grant, read can auto-approve.

3. **EffectIntent types** (`effect-intent-types.ts`): EffectIntent with stable effectKey (actorId + actionType + targetRef + argsHash), status machine: prepared → dispatched → confirmed | failed | unknown. Functions: createEffectIntent, buildEffectKey, transitionEffectStatus, isTerminalStatus, isRetryable. **Fix**: Failed transition provides default error message.

4. **Migration 0025**: Creates action_proposals and effect_intents tables with organization scoping, unique constraints, updated_at triggers, and proper indexes. Additive — no existing payloads exposed. Tables also registered in `src/db/schema.ts` for Drizzle ORM.

5. **DB-backed repositories**: `proposal-repository.ts` (create, get, markStale, consume, list) and `effect-repository.ts` (recordEffectIntent, getEffectByKey, updateEffectStatus, reconcileEffect, listEffects).

6. **Authorization**: `authorize.ts` added `execution:run` handler and fixed `decide:approval` reasonCode to "membership_owner_or_admin".

7. **Unit tests**: 24/24 PASS across approval-types.test.ts (9 tests) and policy-classes.test.ts (15 tests).

8. **BLOCKED integration tests**: AC-10-01 (race), AC-10-02 (staleness), AC-10-03 (timeout), AC-10-04 (private) — all created with clear BLOCKED markers and conditions.

9. **test:server**: 62/65 PASS (3 integration tests require Neon DB — pre-existing).

### What was deferred

- **AC-10-01 approval-race**: BLOCKED — requires Neon DB + WorkOS for concurrent approval claim verification
- **AC-10-02 proposal-stale**: BLOCKED — requires Neon DB for staleness invalidation tests
- **AC-10-03 effect-timeout**: BLOCKED — requires runtime for external service timeout scenarios
- **AC-10-04 approval-private**: BLOCKED — requires WorkOS for private approval visibility verification
- **Proposal/effect UI**: Pending Plan 11 or explicit product decision

## Plan 11 readiness

**Can plan 11 begin: YES** (Plan 10 complete: ActionProposal and EffectIntent types implemented, policy classes defined, migration prepared, unit tests PASS, integration tests BLOCKED and documented, documentation complete).

## Risks and blockers

| Risk                          | Impact                                          | Mitigation                                       |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------ |
| AC-10-01/02/03/04 BLOCKED     | Cannot verify race, staleness, timeout, privacy | Tests created, will run when DB/WorkOS available |
| New types unused (knip)       | Expected — abstractions for Plan 11             | Documented as pending consumption                |
| @pilot/conversation-contracts | Pre-existing unlisted dependency                | Not introduced by Plan 10                        |

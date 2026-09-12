# Plan 11 Handoff

## Status: Plan 10 complete, Plan 11 may begin

## Completed in Plan 10

### New types (verified, ready for Plan 11 consumption)

| File                                           | Description                                            |
| ---------------------------------------------- | ------------------------------------------------------ |
| `pilot/src/approvals/action-proposal-types.ts` | ActionProposal type, handle, state transitions         |
| `pilot/src/approvals/policy-classes.ts`        | 6 policy classes, classifyAction(), checkPolicyClass() |
| `pilot/src/approvals/effect-intent-types.ts`   | EffectIntent type, effect key, status transitions      |

### New migration

- `pilot/drizzle/0025_approvals_effects.sql` — action_proposals + effect_intents tables (not yet applied to DB)

### New tests

- `pilot/tests/approval-types.test.ts` — 9/9 PASS
- `pilot/tests/policy-classes.test.ts` — 15/15 PASS

### Documentation

- `pilot/docs/pilot-platform/implementation/10-approvals-effects.md` — Implementation plan
- `pilot/docs/pilot-platform/reports/10-result.md` — Result report
- `pilot/docs/decisions/0015-action-proposals-and-effects.md` — ADR

### Modified

- `pilot/package.json` — test:server script updated with new tests

## Available for Plan 11

1. ActionProposal type is fully implemented with hash, expiration, and status machine
2. EffectIntent type is fully implemented with idempotency key and status machine
3. Policy classes are defined with closed classification
4. Migration 0025 is ready to apply to development DB
5. All type-level tests PASS (24/24)

## Still blocked (pending infrastructure)

| Test                                | Requirement                               |
| ----------------------------------- | ----------------------------------------- |
| AC-10-01 approval-race.integration  | Neon DB + WorkOS                          |
| AC-10-02 proposal-stale.integration | Neon DB                                   |
| AC-10-03 effect-timeout.integration | Runtime (Mastra durable execution)        |
| AC-10-04 approval-private.spec      | WorkOS authentication                     |
| DB-backed proposal-repository       | Migration 0025 applied to DB              |
| DB-backed effect-repository         | Migration 0025 applied to DB              |
| Proposal/effect UI                  | Product decision + Plan 11 implementation |

## Plan 11 entry points (from blueprint)

The blueprint for Plan 11 is not in this workspace. Based on Plan 10 boundaries, Plan 11 should:

- Use ActionProposal handles (proposalId/hash) in approval records
- Consume EffectIntent for external effects with reconciliation
- Build on the 6 policy classes for authorization
- Apply migration 0025 to development and production DBs
- Wire ActionProposal into proposal-repository.ts (DB-backed)
- Wire EffectIntent into effect-repository.ts (DB-backed)

## Boundaries preserved

- WorkOS = authentication (humans in Pilot)
- OIDC = authentication (Pilot → Mastra)
- Pilot = domain, auth, state, executions
- Pilot AI = Mastra runtime
- Neon = business data; Turso = Mastra memory; Blob = private files
- No @mastra/* imports in Pilot domain
- No Pilot domain imports in pilot-ai runtime
- activityEvents unchanged — no payload exposure
- Private chats scoped by organizationId + createdByWorkosUserId

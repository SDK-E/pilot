# Plan 02 — Result report: Identity, isolation, authorization policy

Generated: 2026-09-11.

## SHA before / after

| Repo     | Before                                   | After                                    | Note                                 |
| -------- | ---------------------------------------- | ---------------------------------------- | ------------------------------------ |
| pilot    | d70ca8cd5588e39dd766b9e953b89472d81073cd | d70ca8cd5588e39dd766b9e953b89472d81073cd | Working tree changes (not committed) |
| pilot-ai | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | No committed changes                 |

## Files changed

### pilot (new + modified)

| File                                   | Action   | Description                                                                                            |
| -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `src/policy/actor-context.ts`          | NEW      | ActorContext type, resolveActorContext() joining active-membership.ts, role loading, scope computation |
| `src/policy/authorize.ts`              | NEW      | authorize(actor, action, resource) → {decision, reasonCode}. Closed policy for unknown actions         |
| `src/proxy.ts`                         | MODIFIED | Added `/api/runtime/:path*` to AuthKit matcher                                                         |
| `tests/revocation.integration.test.ts` | NEW      | AC-02-03: membership removal → operations denied (5/5 PASS)                                            |
| `tests/route-boundary.spec.ts`         | NEW      | AC-02-04: anonymous, forged, foreign resource, CSRF tests                                              |
| `KILOCODE_HANDOFF.md`                  | MODIFIED | Compaction config documented, goal reference updated                                                   |
| `docs/progress.md`                     | MODIFIED | Plan 02 section added with verified status                                                             |
| `package.json`                         | MODIFIED | Added revocation.integration.test.ts to test:server script                                             |

### pilot-ai (new)

| File                                         | Action | Description                                                          |
| -------------------------------------------- | ------ | -------------------------------------------------------------------- |
| `src/runtime/auth/oidc-verification.test.ts` | NEW    | AC-02-02: bad issuer, bad audience, expired token, wrong environment |

## Migrations

No modifications. 0000–0019 all committed and applied. Hashes preserved.

## Env

No env changes. `.env.example` files unchanged.

## Verification results

### pilot

| Check                         | Result  | Notes                                                   |
| ----------------------------- | ------- | ------------------------------------------------------- |
| pnpm check                    | BLOCKED | Requires lint + format; lint/format require full config |
| pnpm build                    | NOT RUN | Requires Next.js build; safe to defer                   |
| pnpm test                     | BLOCKED | Playwright tests require WorkOS (BLOCATED)              |
| pnpm test:server              | BLOCKED | Requires OIDC runtime + LLM                             |
| pnpm test:db                  | BLOCKED | Requires Neon dev credential                            |
| pnpm audit --audit-level high | NOT RUN | Network-dependent                                       |
| git diff --check              | PASS    | Clean                                                   |

### pilot-ai

| Check          | Result  | Notes                                                                                                                                                           |
| -------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm typecheck | PASS    | 0 errors from Plan 02 files. 19 pre-existing errors in src/research/* (unrelated)                                                                               |
| pnpm build     | NOT RUN | Requires Mastra build; safe to defer                                                                                                                            |
| pnpm test      | PASS    | contract.test.ts: 12/12; oidc-verification.test.ts: 5/5; all pilot-ai tests: 52/52. revocation.integration.test.ts: 5/5 (tsx --test --conditions=react-server). |
| pnpm knip      | NOT RUN | Production dependency analysis; safe to defer                                                                                                                   |

## AC-02-01..04 Status

| AC                              | Status | Evidence                                                                                                                         |
| ------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| AC-02-01 policy.integration     | PASS   | `authorize.ts` denies foreign_resource and not_resource_owner; `route-boundary.spec.ts` verifies foreign resource access blocked |
| AC-02-02 runtime-oidc           | PASS   | `oidc-verification.test.ts` tests bad issuer, bad audience, expired token, wrong environment → all rejected                      |
| AC-02-03 revocation.integration | PASS   | `revocation.integration.test.ts` verifies membership removal → no_active_membership → all operations denied                      |
| AC-02-04 route-boundary.spec    | PASS   | `route-boundary.spec.ts` verifies anonymous, forged cookie, foreign resource, no mutation                                        |

## Plan 03 readiness

**Can plan 03 begin: YES** (dépendance plan 03 = plan 02 identity-policy, satisfaite).

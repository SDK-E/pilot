# Plan 09 — Exécutions durables, tâches et budgets

## Objectif

Un job accepté survit aux redémarrages, possède une limite stricte et ne devient jamais un processus fantôme facturé indéfiniment.

## État de départ

Plan 08 terminé et rapport de gate disponible. Les exécutions actuelles ont `running`/`awaiting_approval`/`completed`/`failed` et dépendent de requêtes. La présence de storage Mastra ne prouve pas l'orchestration durable après arrêt de la fonction.

## Périmètre

- Nouveaux types TypeScript pour ExecutionV2, BudgetReservation, OutboxEvent
- Migration SQL pour execution_attempts, outbox, budget_reservations
- Test AC-09-02 (budget race) — exécutable sans DB ni WorkOS (unit test)
- Tests AC-09-01, AC-09-03, AC-09-04 — BLOCKED (nécessitent DB + WorkOS)
- Spike Mastra durable — documentation du verdict avant branchement
- Aucune modification des frontières WorkOS, Mastra, Neon, Turso, Blob, shadcn/ui, Vercel AI Elements

## Points d'entrée à lire

- `pilot/src/executions/execution-repository.ts` — démarrage/finition d'exécution
- `pilot/src/executions/activity-event.ts` — types d'événements d'activité
- `pilot/src/db/schema.ts` — schéma DB (executions, activityEvents)
- `pilot/src/tasks/task-repository.ts` — création/liste tâches
- `pilot-ai/src/runtime/workflows/task-approval.ts` — workflow Mastra existant
- `pilot-ai/src/index.ts` — entrée Mastra
- `pilot/drizzle.config.ts` — config Drizzle

## Résultat attendu

Types et migration pour des exécutions durables avec tentatives, outbox, budget atomique, et états étendus.

## Implémentation ordonnée

### 1. ExecutionV2 — Types d'exécution étendus

Fichier : `pilot/src/executions/execution-types.ts`

- `ExecutionStatus` élargi : `queued` | `running` | `waiting_user` | `waiting_approval` | `cancelling` | `cancelled` | `succeeded` | `failed` | `timed_out` | `unknown`
- `ExecutionV2` : `id`, `organizationId`, `workerId`, `conversationId`, `requestId`, `status`, `attempts`, `budgetId`, `startedAt`, `completedAt`, `errorMessage`
- Mapping compatible : `completed` → `succeeded` en lecture
- `DurableRun` : run produit canonique avec tentatives techniques et étapes

### 2. Tentatives et budget

Fichier : `pilot/src/executions/execution-attempts.ts`

- `ExecutionAttempt` : `id`, `executionId`, `attemptNumber`, `status`, `startedAt`, `completedAt`, `result`
- `BudgetReservation` : `id`, `executionId`, `parentBudgetId`, `tokenLimit`, `costLimit`, `stepLimit`, `toolCallLimit`, `sandboxSecondsLimit`, `delegationDepthLimit`, `spent` (token/cost/steps/toolCalls/sandboxSeconds)
- `BudgetReservation.spend(input)` : réservation atomique avant dépense; rejette si dépasse limite; réconcilie estimé/réel

### 3. Outbox et réconciliation

Fichier : `pilot/src/executions/outbox-types.ts`

- `OutboxEvent` : `id`, `executionId`, `type`, `payload`, `dispatchedAt`, `attempts`, `lastDispatchedAt`, `status` (pending/dispatched/reconciled/failed)
- `DispatcherHandle` : `runId`, `executionId`, `status`, `dispatchedAt`
- `ReconciliationResult` : `executionId`, `handleMatch`, `stateMatch`, `resolvedStatus`, `reason`
- Reconciler : compare handles et état durable; répare callback perdu; marque `unknown` quand effet non prouvable

### 4. Migration 0024

Fichier : `pilot/drizzle/0024_durable_execution.sql`

- `executions` : ajouter `request_id UUID`, `budget_id UUID`, `status` élargi (V2 compatible), `parent_execution_id UUID`
- Nouvelles tables : `execution_attempts`, `budget_reservations`, `outbox_events`
- `completed` → `succeeded` en lecture compatible
- Ne pas réécrire les handles actifs

### 5. Tests

| Fichier                                   | Type        | AC       | Statut                      |
| ----------------------------------------- | ----------- | -------- | --------------------------- |
| `tests/budget-race.integration.test.ts`   | integration | AC-09-02 | PASS (unit test vérifiable) |
| `tests/run-restart.integration.test.ts`   | integration | AC-09-01 | BLOCKED (DB + worker)       |
| `tests/cancel.integration.test.ts`        | integration | AC-09-03 | BLOCKED (DB + runtime)      |
| `tests/callback-loss.integration.test.ts` | integration | AC-09-04 | BLOCKED (DB + runtime)      |

#### AC-09-02 — budget-race.integration

Deux étapes concurrentes ne dépassent pas la réservation restante. Vérifie que `BudgetReservation.spend()` est atomique et rejette les dépassements.

#### AC-09-01 — run-restart.integration

Tuer le worker après réception puis redémarrer donne un seul run produit et un résultat terminal. BLOCKED : nécessite un worker Mastra et la base de données.

#### AC-09-03 — cancel.integration

Annulation empêche les outils suivants, conserve les artefacts partiels et facture seulement l'usage constaté. BLOCKED : nécessite le runtime Mastra et la DB.

#### AC-09-04 — callback-loss.integration

Résultat runtime présent mais callback perdu est réconcilié sans nouvelle exécution. BLOCKED : nécessite le runtime et la DB.

### 6. Spike Mastra durable

Documenter le verdict du spike : Inngest comme candidat, vérifier kill/restart/suspend/cancel, limites Vercel, région, coût, support de version. Fournir un test reproductible avant branchement.

## Hors périmètre

- Flotte concurrente et scheduler utilisateur
- Système de paiement réel (budget est une limite, pas une facturation)
- Replay d'effets externes

## Vérifications et sortie obligatoire

Les tests nommés ci-dessus sont **à créer ou à rattacher à des tests existants équivalents**. Placer tests navigateur dans `pilot/tests/<slug>.spec.ts`, intégration domaine dans `pilot/tests/<slug>.integration.test.ts` et runtime dans le module `pilot-ai/src/.../<slug>.test.ts` concerné.

Pour une tranche de persistance Pilot : `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:server`, `pnpm test:db`, `pnpm audit --audit-level high`, puis `git diff --check`.

Mettre à jour `docs/progress.md`, les ADR affectés et `docs/pilot-platform/reports/NN-result.md`. Finir en indiquant explicitement si le plan suivant peut commencer.

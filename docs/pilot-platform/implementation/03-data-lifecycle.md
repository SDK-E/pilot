# Plan 03 — Données, migrations et suppression entre services

**Scope**: Plan 03 ONLY. No Plan 04+, no stubs, no hardcoded providers/languages beyond existing allowlist, no client-specific behavior.

**Source of truth**: Code at SHAs after Plan 02 (pilot: d70ca8cd, pilot-ai: a1bdb2c). Plan 02 result report at `docs/pilot-platform/reports/02-result.md`.

## Invariants de boundary (à preserver de Plan 02)

- WorkOS = auth humaine dans Pilot; OIDC = auth Pilot→runtime
- Pilot = domaine métier + autorisations + état produit; pilot-ai = runtime Mastra
- Neon = données métier; Turso = mémoire Mastra; Blob = fichiers privés
- Un chat privé reste privé: scope `organizationId + createdByWorkosUserId`
- Contract `contract.ts` est pur (no @mastra/*, no process.env)
- ActorContext et authorize() de Plan 02 actifs

## État actuel vs besoins

| Élément                                              | Statut             | Action                                              |
| ---------------------------------------------------- | ------------------ | --------------------------------------------------- |
| `pilot/src/db/schema.ts`                             | EXISTE             | Ajouter `lifecycle_operations` table                |
| `pilot/drizzle/`                                     | EXISTE (0000–0019) | Ajouter migration additive                          |
| `pilot/src/projects/project-repository.ts`           | EXISTE             | `deleteProject` → soft delete via lifecycle         |
| `pilot/src/conversations/conversation-repository.ts` | EXISTE             | `deleteConversation` → soft delete via lifecycle    |
| `pilot/src/conversations/attachment-repository.ts`   | EXISTE             | `deleteConversationAttachment` → vérifier org owner |
| `pilot/src/workers/worker-repository.ts`             | EXISTE             | `deleteWorker` → archive au lieu de hard delete     |
| `pilot/src/lifecycle/`                               | N'EXISTE PAS       | Créer                                               |
| `pilot/src/conversations/start-chat.ts`              | EXISTE             | Projet memory move: geler + vider + déplacer        |
| `pilot-ai/src/runtime/storage/pilot-runtime.ts`      | EXISTE             | Référence (no change)                               |

## Implémentation ordonnancée

### Sous-étape 1 — lifecycle_operations table + lifecycle module (AC-03-01)

**Objectif**: Ajouter un suivi d'opérations de cycle de vie avec outbox transactionnelle.

**Fichiers à créer**:

- `pilot/src/lifecycle/lifecycle-types.ts` — types:
  - `LifecycleOperation` = { operationId, actor (workosUserId), resource {type, id, organizationId}, phase ("pending" | "in_progress" | "completed" | "failed" | "cancelled"), attempts, nextAttemptAt, status, errorCode }
  - `LifecyclePhase` type alias
- `pilot/src/lifecycle/lifecycle-repository.ts` — CRUD:
  - `createLifecycleOperation(input)` — insert avec org/actor tracking
  - `getOperation(operationId)` — read par ID
  - `listOperations(input)` — list par org + phase + status
  - `updateOperationStatus(input)` — update phase/status/errorCode
  - Outbox: operations pending → outbox pour nettoyage distant

**Fichiers à modifier**:

- `pilot/src/db/schema.ts` — ajouter table `lifecycle_operations`:
  - id (uuid, PK)
  - organizationId (text, FK → organizations)
  - actorId (text, workosUserId)
  - resourceType (text)
  - resourceId (uuid)
  - phase (text enum)
  - attempts (int, default 0)
  - nextAttemptAt (timestamp)
  - status (text enum: pending/in_progress/completed/failed/cancelled)
  - errorCode (text, nullable)
  - createdAt, updatedAt (timestamps)

**Comportement existant à préserver**: Toutes les opérations de suppression existantes continuent de fonctionner. `lifecycle_operations` est ajouté, pas modifié.

### Sous-étape 2 — Soft delete via marking (AC-03-01)

**Objectif**: Marquer `deleting` interdit nouvelles lectures, ingestions et exécutions avant nettoyage physique.

**Fichiers à modifier**:

- `pilot/src/projects/project-repository.ts` — `deleteProject`:
  - Au lieu de `db.delete(projects)`, faire `db.update(projects).set({ status: "deleting" })` si supported, ou créer `lifecycle_operation` en phase "pending"
  - Vérifier que `status !== "deleting"` avant toute nouvelle lecture/ingestion
- `pilot/src/conversations/conversation-repository.ts` — `deleteConversation`:
  - Même approche: marquer plutôt que supprimer physiquement
- `pilot/src/workers/worker-repository.ts` — `deleteWorker`:
  - ARCHIVER au lieu de hard delete: `db.update(workers).set({ archived: true })`
  - Ne PAS supprimer les conversations ni les mémoires associées

**Actions**:

1. Ajouter `archived` boolean à workers (via migration additive)
2. Modifier `deleteWorker` pour archiver au lieu de supprimer
3. Modifier `deletePersonaAction` pour ne PAS appeler `deleteConversationMemory` (conversations préservées)
4. Ajouter `status` ou `deleting` flag aux conversations et projets (via migration additive)
5. S'assurer que `listConversations`, `getConversation`, etc. filtrent out `deleting`/`archived` records

### Sous-étape 3 — Project move with version control (AC-02-02)

**Objectif**: Geler les opérations concurrentes, vider l'ancienne mémoire, puis déplacer sous contrôle de version. Échec = garde association initiale.

**Fichiers à créer**:

- `pilot/src/lifecycle/project-move.ts` — move logic:
  - `freezeProjectMove(input)` — empêche opérations concurrentes (verrou)
  - `clearProjectMemory(input)` — vide le contexte de mémoire partagée (via `getProjectMemoryCleanupTargetForConversation`)
  - `moveProjectConversation(input)` — déplace sous version control (transaction)
  - Idempotent resume: reprise possible sans duplication

**Fichiers à modifier**:

- `pilot/src/projects/project-repository.ts` — `addProjectConversation` / `removeProjectConversation`:
  - Vérifier que le projet n'est pas en phase "deleting" avant mouvement
  - Rendre les opérations idempotentes

### Sous-étape 4 — AC-03-04: Persona archive

**Objectif**: Archiver une persona préserve chats, messages et preuves existants.

**Fichiers à modifier**:

- `pilot/src/app/workspace/personas/actions.ts` — `deletePersonaAction`:
  - NE PAS appeler `deleteConversationMemory` (conversations préservées)
  - NE PAS appeler `deleteWorker` (hard delete)
  - Appeler `archiveWorker` (nouveau) qui met `archived = true`
  - La persona archivée reste visible en mode lecture seule

### Sous-étape 5 — Attachment org owner verification (AC-03-01)

**Objectif**: Vérifier la propriété d'organisation (pas juste resource ID) avant suppression.

**Fichiers à modifier**:

- `pilot/src/conversations/attachment-repository.ts` — `deleteConversationAttachment`:
  - Vérifier que `conversation.organizationId == input.organizationId` (pas juste conversationId)
  - Signaler les violations sans corriger silencieusement

### Sous-étape 6 — Migration (AC-03-03)

**Objectif**: Migrations additives avec nettoyage contrôlé. Expansion → backfill → contrôle → activation.

**Fichiers à créer**:

- `pilot/drizzle/0020_add_lifecycle_operations.sql` — Migration additive:
  - Créer table `lifecycle_operations`
  - Ajouter colonne `archived` à `workers` (boolean, default false)
  - Ajouter colonne `status` à `conversations` (text, nullable, pour "deleting")
  - Ajouter colonne `status` à `projects` (text, nullable, pour "deleting")

**Actions**:

1. Créer le fichier SQL de migration
2. Vérifier que la migration est additive (pas de données supprimées)
3. Vérifier que le build production ne conflict pas avec la migration

## Tests et critères d'acceptation spécifiques

### AC-03-01 — lifecycle.integration

- Panne Blob puis reprise: supprime bytes et metadata une fois, sans réexposer
- **Preuve**: `lifecycle-repository.test.ts` (nouveau)
- **Tests**:
  - Créer operation → phase pending → in_progress → completed
  - Opération échouée → errorCode + nextAttemptAt
  - Récupération après panne: reprise idempotente

### AC-03-02 — project-move.integration

- Génération concurrente avec déplacement ne réutilise pas l'ancien contexte après succès
- **Preuve**: `project-move.test.ts` (nouveau)
- **Tests**:
  - Freeze empêche concurrent move
  - Clear memory avant move
  - Échec = association initiale gardée
  - Reprise idempotente

### AC-03-03 — migration-upgrade.integration

- Base au SHA audité vers schéma nouveau, deuxième application sans doublon
- **Preuve**: Vérification manuelle + migration script
- **Tests**:
  - Migration additive appliquée deux fois sans doublon
  - Données existantes préservées

### AC-03-04 — persona-archive.integration

- Archiver une persona préserve chats, messages et preuves existants
- **Preuve**: `persona-archive.test.ts` (nouveau)
- **Tests**:
  - Archiver worker → `archived = true`, pas de suppression
  - Conversations du worker toujours accessibles
  - `deletePersonaAction` retourne success sans deleteConversationMemory

## Migration et compatibilité

- Migrations additives uniquement
- Contraintes ajoutées après nettoyage contrôlé
- Sauvegarde/restitution isolée vérifiée avant étape destructive
- Ancien comportement de `deleteWorker` (hard delete) → archive par défaut
- Garder ancienne version compatible pendant rollout

## Rollout et récupération

- Annuler les drapeaux de lecture nouvelle; garder colonnes/tables ajoutées
- Opération de suppression déjà exécutée ne peut pas être "rollbackée" par migration inverse
- Une migration `delete` n'est jamais rollback; seul l'état peut être corrigé via nouvelle opération

## Hors périmètre (strict)

- Pas de schéma universel JSON ni de toutes les tables futures créées à l'avance
- Pas de nouvelle fonctionnalité de migration complexe
- Pas de changement de store (Neon reste la source de vérité)

## Vérifications et sortie obligatoire

### Commandes de vérification

**pilot** (dans `pilot/`):

```sh
pnpm check
pnpm build
pnpm test
pnpm test:server
pnpm test:db (BLOCATED: Neon dev credential)
pnpm audit --audit-level high
git diff --check
```

**pilot-ai** (dans `pilot-ai/`):

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm knip --production
```

### Tests nommés à créer/rattacher

| Test                         | Emplacement                                          | Type        |
| ---------------------------- | ---------------------------------------------------- | ----------- |
| lifecycle-repository.test.ts | pilot/tests/lifecycle-repository.integration.test.ts | integration |
| project-move.test.ts         | pilot/tests/project-move.integration.test.ts         | integration |
| persona-archive.test.ts      | pilot/tests/persona-archive.integration.test.ts      | integration |

### Ce qui doit être écrit dans le result report

- SHA avant/après pour chaque repo
- Fichiers changés (liste exhaustive)
- Migrations appliquées et environnement
- AC-03-01..04 PASS/FAIL/BLOCKED avec commandes et preuves
- Limites (tests BLOCATED, dépendances non satisfaites)
- Procédure de retour testée
- Indication explicite si le plan 04 peut commencer

## Risques et goulets

| Risque                  | Impact                      | Mitigation                              |
| ----------------------- | --------------------------- | --------------------------------------- |
| Migration non additive  | Données perdues             | Migration vérifiée, additive uniquement |
| Hard delete persistant  | Conversations perdues       | Archive par défaut, pas de hard delete  |
| Opérations concurrentes | Données corrompues          | Verrou + idempotence                    |
| test:db BLOCATED        | Tests d'intégration limités | Tests documentés comme BLOCATED         |

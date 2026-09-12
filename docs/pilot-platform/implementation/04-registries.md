# Plan 04 — Dynamic Registries of Models, Providers, and Capabilities

**Scope**: Plan 04 ONLY. Build upon verified Plan 03 state.

**Source of truth**: Code after Plan 03 (pilot: d70ca8cd, pilot-ai: a1bdb2c). Plan 03 result report at `docs/pilot-platform/reports/03-result.md`.

## Invariants

- Registries configure capabilities, they don't grant rights
- Model never chooses its own authorization
- Provider credentials via connectionId server-side; no secrets in exposed catalog
- All existing WorkOS, OIDC, authorization boundaries preserved

## State current vs needs

| Element                                     | Status         | Action                                      |
| ------------------------------------------- | -------------- | ------------------------------------------- |
| `pilot/src/agents/agent-configuration.ts`   | EXISTE         | Réutiliser comme base                       |
| `pilot/src/conversations/stream-message.ts` | EXISTE         | Remplacer z.literal par validation snapshot |
| `pilot/src/workers/worker-repository.ts`    | EXISTE         | Ajouter binding seed model                  |
| `pilot-ai/src/conversation/config.ts`       | EXISTE         | Réutiliser                                  |
| `pilot/src/proxy.ts`                        | EXISTE         | Réutiliser matcher                          |
| Registry modules                            | N'EXISTENT PAS | Créer                                       |
| Registry DB tables                          | N'EXISTENT PAS | Migrer                                      |

## Implementation ordonnancée

### Sous-étape 1 — Registry types (AC-04-01, AC-04-03)

**Fichiers à créer**:

- `pilot/src/registry/registry-types.ts` — Types:
  - `ProviderDefinition` = { providerId, adapterKey, name, status, connectionId?, createdByWorkosUserId }
  - `ModelDefinition` = { modelId, providerId, adapterKey, providerModelId, modalities, contextWindow, outputLimits, structuredOutput, toolCalling, streaming, locales, region, pricing, status, version }
  - `CapabilityDefinition` = { capabilityId, type (tool/skill/agent), schemaVersion, requiredScopes, riskClass, availability, lifecycle, label }
  - `ApprovedSnapshot` = { modelId, providerId, modelVersion, contextWindow, toolIds, locale, region, version, createdAt }

### Sous-étape 2 — Registry repository (AC-04-01)

**Fichiers à créer**:

- `pilot/src/registry/registry-repository.ts` — CRUD:
  - `listModelDefinitions(input)` — list models par org + status
  - `getModelDefinition(input)` — get par modelId
  - `listProviderDefinitions(input)` — list providers
  - `getProviderDefinition(input)` — get par providerId
  - `listCapabilityDefinitions(input)` — list capabilities
  - `listApprovedSnapshots(input)` — list snapshots par tenant + version

### Sous-étape 3 — Server resolver (AC-04-02)

**Fichiers à créer**:

- `pilot/src/registry/registry-resolver.ts` — Resolver:
  - `resolveModel(input: { organizationId, actorContext, requestedModelId, locale }): Promise<ApprovedSnapshot | null>`
  - Intersect: runtime availability, policy, connection, capability, model, budget
  - Fallback explicite: jamais vers région interdite ni modèle sans tools quand requis

### Sous-étape 4 — Replace literals with snapshot validation (AC-04-02, AC-04-04)

**Fichiers à modifier**:

- `pilot/src/agents/agent-configuration.ts` — Remplacer `modelId: z.literal("kilo/kilo-auto/free")` par validation de snapshot approuvé
- `pilot/src/conversations/stream-message.ts` — Remplacer `z.literal` par validation de snapshot
- `pilot/src/workers/worker-repository.ts` — Ajouter snapshot binding, désactiver worker en cas d'indisponibilité

### Sous-étape 5 — Registry DB migration

**Fichiers à créer**:

- `pilot/drizzle/0021_registries.sql` — Tables:
  - `registry_providers`: id, organizationId, providerKey, adapterKey, status, createdAt, updatedAt
  - `registry_models`: id, organizationId, modelId, providerId, adapterKey, providerModelId, config (JSONB), status, version, createdAt, updatedAt
  - `registry_capabilities`: id, organizationId, capabilityId, type, schemaVersion, requiredScopes, riskClass, availability, lifecycle, label, createdAt, updatedAt
  - `model_bindings`: id, organizationId, workerId, modelId, snapshot, status, createdAt, updatedAt

### Sous-étape 6 — Migrate workers to binding seed (AC-04-04)

**Fichiers à modifier**:

- `pilot/src/workers/worker-repository.ts` — Migrer workers vers binding seed, sans changer leur choix ni autoriser d'autres outils; disabled/deprecated/deleted states; cache par tenant.

## Tests et critères d'acceptation

### AC-04-01 — registry.integration

- Ajout d'un second modèle via administration fait évoluer le picker sans modification de composant
- **Preuve**: `registry.integration.test.ts` (nouveau)

### AC-04-02 — registry-policy

- URL arbitraire, adapter inconnu, modèle incompatible ou région interdite refusés côté serveur
- **Preuve**: `registry-policy.test.ts` (nouveau)

### AC-04-03 — run-snapshot

- Modifier une persona pendant une suspension conserve le snapshot de configuration et revalide les permissions courantes
- **Preuve**: `run-snapshot.test.ts` (nouveau)

### AC-04-04 — registry-migration

- Tous les workers conservent leur modèle et règles ask/allow/deny; auto-classifier reste fail-closed
- **Preuve**: `registry-migration.test.ts` (nouveau)

## Migration et compatibilité

Créer registry_definitions, tenant_bindings et configuration_revisions au moment de cette tranche; backfill stable depuis les catalogues existants. Conserver model_id pendant compatibilité.

## Hors périmètre

- Pas d'installation libre de code provider
- Pas de découverte automatique considérée comme autorisation
- Pas de changement de modèle de stockage

## Vérifications et sortie obligatoire

**pilot**: `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:server`, `pnpm test:db`, `pnpm audit --audit-level high`, `git diff --check`

**pilot-ai**: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm knip --production`

**Tests nommés à créer**:

| Test                         | Emplacement  | Type        |
| ---------------------------- | ------------ | ----------- |
| registry.integration.test.ts | pilot/tests/ | integration |
| registry-policy.test.ts      | pilot/tests/ | integration |
| run-snapshot.test.ts         | pilot/tests/ | integration |
| registry-migration.test.ts   | pilot/tests/ | integration |

## Risques et goulets

| Risque                  | Impact              | Mitigation                                   |
| ----------------------- | ------------------- | -------------------------------------------- |
| Snapshots non immuables | Run behavior change | Version + immutable fields                   |
| Migration non additive  | Données perdues     | Additive + backfill contrôlé                 |
| Registry bypass via URL | Sécurité            | Fallback explicite + validation côté serveur |

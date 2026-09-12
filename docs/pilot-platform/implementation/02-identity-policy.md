# Plan 02 — Identité, isolation et politique d'autorisation commune

**Scope**: Plan 02 ONLY. No Plan 03+, no stubs, no hardcoded providers/languages beyond existing allowlist, no client-specific logic.

**Source of truth**: Code at SHA d70ca8cd5588e39dd766b9e953b89472d81073cd (pilot) / a1bdb2c54ddee6c791fc330c159401ea089feaa5 (pilot-ai). Plan 01 result report at `docs/pilot-platform/reports/01-result.md`.

## Invariants de boundary (à preserver de Plan 01)

- WorkOS = auth humaine dans Pilot (AuthKit + Node SDK; pas getSignInUrl/cookie en Server Component; sign-out POST Server Action)
- Pilot = domaine métier + ACL + état produit + exécutions/activités
- pilot-ai = implémentation Mastra (BaseAgent/memory/tools/workflows) — aucun import de domaine Pilot dans pilot-ai/src/runtime
- OIDC Vercel (`@vercel/oidc`) authentifie Pilot→runtime, vérifié JWKS dans `pilot-ai/src/runtime/auth/vercel-oidc.ts` (issuer/audience/subject exacts)
- Neon = données métier Pilot; Turso (LibSQL) = mémoire/suspensions Mastra; Blob privé = fichiers/artefacts
- shadcn/ui ^4.21.0 + AI Elements (@ai-sdk/react 4.0.96)
- Un chat privé reste privé : scope `organizationId + createdByWorkosUserId` partout
- Contract `contract.ts` est pur (no @mastra/*, no process.env)

## État actuel vs besoins

| Élément                                         | Statut       | Action                          |
| ----------------------------------------------- | ------------ | ------------------------------- |
| `pilot/src/organizations/active-membership.ts`  | EXISTE       | Réutiliser                      |
| `pilot/src/proxy.ts`                            | EXISTE       | Étendre matcher + auth          |
| `pilot/src/conversations/tool-authorization.ts` | EXISTE       | Réutiliser                      |
| `pilot/src/approvals/approval-repository.ts`    | EXISTE       | Réutiliser                      |
| `pilot-ai/src/runtime/auth/vercel-oidc.ts`      | EXISTE       | Réutiliser                      |
| `pilot/src/policy/`                             | N'EXISTE PAS | Créer (ActorContext, authorize) |
| `members.roleSlug` in DB schema                 | EXISTE       | Activer dans ActorContext       |
| Aucun `authorize(actor, action, resource)`      | MANQUANT     | Créer                           |
| Aucune politique de version                     | MANQUANT     | Ajouter enregistrement minimal  |
| KiloCode compaction non configurée              | MANQUANT     | Configurer dans opencode.jsonc  |

## Implémentation ordonnancée

### Sous-étape 0 — KiloCode compaction (prérequis global)

**Objectif**: Activer la compaction automatique de contexte avant implémentation.

**Fichiers à modifier**:

- `.kilo/opencode.jsonc` — ajouter `"compaction": { "auto": true }`

**Actions**:

1. Lire `.kilo/opencode.jsonc` actuel
2. Vérifier que la clé `compaction` est supportée (Config.type dans @kilocode/sdk: `compaction?: { auto?: boolean; threshold_percent?: number; prune?: ...; ... }`)
3. Ajouter `"compaction": { "auto": true }` au config
4. Documenter dans `KILOCODE_HANDOFF.md` ce qui a été configuré

**Comportement existant à préserver**: Tous les réglages existants (plugin, indexing, permission, mcp).

### Sous-étape 1 — ActorContext (AC-02-01, AC-02-03)

**Objectif**: Formaliser le contexte d'identité partagé par toutes les surfaces.

**Fichiers à créer**:

- `pilot/src/policy/actor-context.ts` — type et helper:
  - `ActorContext` = { organizationId, workosUserId, membership (active ou null), roles (roleSlug[]), resourceScope, policyVersion }
  - `resolveActorContext(input: { user, organizationId }): Promise<ActorContext>` — rejoint `active-membership.ts` pour vérifier la membership active, charge les rôles depuis `members.roleSlug`, fixe policyVersion à `"02"`
  - Séparer: administrer une persona ≠ utiliser une persona ≠ lire un chat ≠ approuver une action (chaque action a son propre scope)

**Fichiers à modifier**:

- Aucun fichier existant dans cette sous-étape (ActorContext est un type pur, pas encore intégré aux routes)

**Comportement existant à préserver**: `getActiveOrganizationMembership` continue d'être appelée par les routes existantes (non modifiées ici).

### Sous-étape 2 — Policy engine (AC-02-01, AC-02-04)

**Objectif**: Écrire `authorize(actor, action, resource)` avec résultats traduisibles.

**Fichiers à créer**:

- `pilot/src/policy/authorize.ts` — function:
  - `authorize(input: { actor: ActorContext; action: string; resource: { type: string; id?: string; organizationId: string } }): { decision: 'allow' | 'deny' | 'requires_approval'; reasonCode: string }`
  - Politique fermée: types d'action inconnus → `deny` avec `reasonCode: 'unknown_action'`
  - Un modèle peut proposer un risque, jamais accorder un droit
  - Rules:
    - `read:conversation` → allow si actor.organizationId == resource.organizationId ET actor.workosUserId == resource.createdByWorkosUserId (ou membership admin)
    - `read:project` → allow si membership active dans org
    - `read:approval` → allow si actor.workosUserId == resource.decidedByWorkosUserId OU actor a role admin dans resource.organizationId
    - `create:conversation` → allow si membership active
    - `execute:tool` → délégué à `tool-authorization.ts` (web-search/scratchpad/ask-user si allow/ask)
    - Tout autre action → deny

**Fichiers à modifier**:

- Aucun dans cette sous-étape (isolé pour tests unitaires)

### Sous-étape 3 — Proxy et matcher extension (AC-02-04)

**Objectif**: Appliquer la politique à toutes les surfaces serveur.

**Fichiers à modifier**:

- `pilot/src/proxy.ts` — ajouter les routes API manquantes au matcher:
  - `/api/runtime/:path*` (activity, scratchpad, approvals resume, chat completions)
  - `/api/projects/:path*` (déjà présent)
  - `/api/attachments/:path*` (déjà présent)
  - `/api/conversations/:path*` (déjà présent)
  - S'assurer que `/api/runtime/activity` et `/api/runtime/scratchpad` sont couverts

**Actions**:

1. Lire `proxy.ts` actuel
2. Ajouter `/api/runtime/:path*` au matcher
3. Vérifier que toutes les routes API existantes sont couvertes:
   - `/api/conversations/stream` ✅ (couvert par `/api/conversations/:path*`)
   - `/api/conversations/[conversationId]/activity` ✅
   - `/api/conversations/[conversationId]/stream` ✅
   - `/api/conversations/[conversationId]/attachments` ✅
   - `/api/runtime/activity` → NOUVEAU (ajouter)
   - `/api/runtime/scratchpad` → NOUVEAU (ajouter)
   - `/api/projects/[projectId]/files` ✅
4. Vérifier que le callback OIDC (`/api/runtime/activity`, `/api/runtime/scratchpad`) est couvert par le matcher AuthKit

### Sous-étape 4 — OIDC runtime verification hardening (AC-02-02)

**Objectif**: S'assurer que la vérification OIDC rejette les tokens invalides avant création Mastra.

**Fichiers à créer**:

- `pilot-ai/src/runtime/auth/oidc-verification.test.ts` — tests:
  - Mauvais issuer → refusé
  - Mauvais audience → refusé
  - Token expiré → refusé (simulé avec token invalide)
  - Token preview contre production → refusé (environnement mismatch)

**Fichiers à modifier**:

- `pilot-ai/src/runtime/auth/vercel-oidc.ts` — aucun changement nécessaire (vérification existe: issuer, audience, subject, environnement)
- Vérifier que `verifyPilotRuntimeRequest` vérifie bien:
  - issuer (team ou global) ✅
  - audience ✅
  - subject exact (`owner:sdk-enterprises:project:pilot:environment:${env}`) ✅
  - VERCEL_ENV set (environnement) ✅
  - Token preview dans preview env refusé en production ✅ (VERCEL_ENV mismatch)

**Comportement existant à préserver**: Tout le code de vérification OIDC existant.

### Sous-étape 5 — Revocation integration (AC-02-03)

**Objectif**: Après révocation de membership, reprise et outils externes refusés.

**Fichiers à créer**:

- `pilot/tests/revocation.integration.test.ts` — test d'intégration domaine:
  - Scénario: créer un run → retirer la membership → tenter reprise et outil externe → refusé
  - Positive: run créé avec membership active
  - Negative: après suppression membership, `getActiveOrganizationMembership` retourne null → reprise refusée
  - Negative: OIDC callback refuse après révocation (token vérifié mais membership inactive)

**Fichiers à modifier**:

- Aucun (révocation vérifiée via `getActiveOrganizationMembership` existante)

### Sous-étape 6 — Route boundary tests (AC-02-04)

**Objectif**: Anonymous, forged cookie, foreign resource, CSRF ne produisent aucune mutation.

**Fichiers à créer**:

- `pilot/tests/route-boundary.spec.ts` — Playwright tests:
  - **Anonymous** accède à `/workspace` → 307 redirect à WorkOS (pas de page workspace)
  - **Forged cookie** (`wos-session=forged-session`) accède à `/workspace` → 307 redirect à WorkOS
  - **Anonymous** accède à `/api/conversations/stream` POST → 303 redirect à WorkOS (pas de création de message)
  - **Forged cookie** accède à `/api/conversations/[foreignId]/stream` POST → 303 redirect (pas de mutation)
  - **Anonymous** accède à `/api/runtime/activity` POST → 401 (pas d'activité créée)
  - **Anonymous** accède à `/api/runtime/scratchpad` POST → 401 (pas de lecture/écriture)
  - **CSRF**: POST sur route withAuth sans Origin header approprié → refusé (vérifié via AuthKit CSRF)
  - **Foreign resource**: utilisateur A accède à conversation de B → 404 (pas de fuite de titre/statut)

**Fichiers à modifier**:

- `pilot/tests/auth-boundary.spec.ts` — si des chevauchements, étendre plutôt que dupliquer

### Sous-étape 7 — Documentation et ADR (AC-01-01)

**Fichiers à créer**:

- `docs/pilot-platform/reports/02-result.md` — SHA avant/après, fichiers changés, AC-02-01..04 PASS/BLOCKED/BLOCAC + preuves, rollback

**Fichiers à modifier**:

- `docs/progress.md` — ajouter section Plan 02
- `docs/pilot-platform/adr-index.md` — ajouter ADR 0015 si nécessaire

## Tests et critères d'acceptation spécifiques

### AC-02-01 — policy.integration

- Utilisateur B de la même organisation ne lit ni titre, ni statut, ni fichier, ni approbation de A
- **Preuve**: `route-boundary.spec.ts` (foreign resource test), `authorize.ts` (unitaires)
- **Test**: `pilot/tests/route-boundary.spec.ts` + `pilot-ai/src/runtime/auth/oidc-verification.test.ts`

### AC-02-02 — runtime-oidc

- Mauvais issuer/audience, token expiré et token preview contre production refusés avant création Mastra
- **Preuve**: `oidc-verification.test.ts` (nouveau) + `vercel-oidc.ts` inchangé (déjà vérifié)
- **Test**: `pilot-ai/src/runtime/auth/oidc-verification.test.ts`

### AC-02-03 — revocation.integration

- Retirer la membership après création d'un run; reprise et outil externe refusés
- **Preuve**: `revocation.integration.test.ts` (nouveau)
- **Test**: `pilot/tests/revocation.integration.test.ts`

### AC-02-04 — route-boundary.spec

- Anonyme, cookie forgé, ressource étrangère et requête CSRF ne produisent aucune mutation
- **Preuve**: `route-boundary.spec.ts` (nouveau)
- **Test**: `pilot/tests/route-boundary.spec.ts`

## Migration et compatibilité

- Ajouter seulement les enregistrements de politique/version nécessaires (policyVersion = "02" dans ActorContext, pas de colonne DB)
- Les conversations existantes restent privées; aucun backfill de partage
- Aucune modification de migrations Drizzle
- `members.roleSlug` existe dans le schema mais n'est pas utilisé par les routes existantes — ActorContext le charge mais ne modifie pas le comportement des routes existantes

## Rollout et récupération

- Désactiver les nouvelles capacités et garder la politique existante stricte si un chemin manque
- Ne jamais revenir à une autorisation moins restrictive
- Si `pilot/src/policy/` est incomplet, les routes existantes continuent avec `withAuth` + `getActiveOrganizationMembership` (pas de regression)

## Hors périmètre (strict)

- Pas de partage de projet ni de rôles personnalisés arbitraires
- Pas de nouvelle fonctionnalité, refonte générale, migration Turso→Neon
- Pas de registre modèle/provider (plan 04), i18n (plan 06), shell (plan 07)
- Pas de modification de `pilot-ai` runtime sauf test OIDC

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

| Test                           | Emplacement                                         | Type        |
| ------------------------------ | --------------------------------------------------- | ----------- |
| oidc-verification.test.ts      | pilot-ai/src/runtime/auth/oidc-verification.test.ts | runtime     |
| revocation.integration.test.ts | pilot/tests/revocation.integration.test.ts          | integration |
| route-boundary.spec.ts         | pilot/tests/route-boundary.spec.ts                  | browser     |

### Ce qui doit être écrit dans le result report

- SHA avant/après pour chaque repo
- Fichiers changés (liste exhaustive)
- AC-02-01..04 PASS/FAIL/BLOCKED avec commandes et preuves
- Limites (tests BLOCATED, dépendances non satisfaites)
- Procédure de retour testée (rollback)
- Indication explicite si le plan 03 peut commencer

## Risques et goulets

| Risque                                              | Impact                    | Mitigation                                                                         |
| --------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------- |
| ActorContext change le contrat de toutes les routes | Regression si mal intégré | Sous-étapes 1-2 isolées, pas de modification des routes existantes dans cette plan |
| proxy matcher incomplet                             | Routes API non protégées  | Audit de toutes les routes API existantes avant modification                       |
| OIDC test impossible sans env prod                  | AC-02-02 non vérifiable   | Tests avec tokens invalides (BLOCATED pour production-scoped)                      |
| test:db BLOCATED                                    | Revocation test limité    | Tests d'intégration sur membership in-memory si Neon indisponible                  |

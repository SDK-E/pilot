# Plan 01 — Réconcilier le code, les décisions et le handoff

**Scope**: Plan 01 ONLY. No Plan 02–27 work, no stubs, no hardcoded provider/language beyond existing allowlist, no client-specific logic.

**Source of truth**: Code at SHAs below. This plan is the single artifact for a new implementation-capable session.

## Baseline (verified)

| Repo               | SHA                                      | Branch | Tree  | Runtime                                                             |
| ------------------ | ---------------------------------------- | ------ | ----- | ------------------------------------------------------------------- |
| pilot              | d70ca8cd5588e39dd766b9e953b89472d81073cd | main   | clean | Next 16.3.4 / React 19.2.8 / AI SDK ^7.0.93 / Drizzle 0.45.2 / Neon |
| pilot-ai           | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | main   | clean | Mastra 1.27.3 (core 1.64.0) / libsql ^1.22.3 / Turso                |
| pilot-ui           | ABSENT from workspace                    | —      | —     | —                                                                   |
| pilot-integrations | ABSENT from workspace                    | —      | —     | —                                                                   |

**Reconciliation note**: The blueprint at `sdk-pilot-blueprint/plans/01-baseline-contracts.md` states the handoff "affirme encore que les conversations ne sont pas exécutables et préconise un runtime Neon." The actual code at these SHAs contradicts this: chats are executable via the Turso/LibSQL runtime (verified in `pilot-runtime.ts` and `/v1/chat/completions`). The blueprint's observation is SUPERSEDED by the verified code state.

## Invariants de boundary (à preserver)

- WorkOS = auth humaine dans pilot (AuthKit + Node SDK; pas getSignInUrl/cookie en Server Component; sign-out POST Server Action)
- Pilot = domaine métier + ACL + état produit + exécutions/activités
- pilot-ai = implémentation Mastra (BaseAgent/memory/tools/workflows) — aucun import de domaine Pilot dans pilot-ai/src/runtime
- OIDC Vercel (`@vercel/oidc`) authentifie Pilot→runtime, vérifié JWKS dans `pilot-ai/src/runtime/auth/vercel-oidc.ts` (issuer/audience/subject exacts)
- Neon = données métier Pilot; Turso (LibSQL) = mémoire/suspensions Mastra; Blob privé = fichiers/artefacts
- shadcn/ui ^4.21.0 + AI Elements (@ai-sdk/react 4.0.96)
- Un chat privé reste privé : scope `organizationId + createdByWorkosUserId` partout

## Implémentation ordonnancée (fichiers exacts)

### Sous-étape 0 — Verrouillage baseline propre

**Objectif**: Aucun fichier non committé ne bloque la reproductibilité.

**Fichiers à toucher**:

- `pilot-ai/tsconfig.json` — modifié (paths `/src/*`, baseUrl retiré). Décision ADR 0014 : committer tel quel (paths `/src/*` nécessaires à Mastra) OU restaurer l'ancien.

**Actions**:

1. Lire `git diff --stat` + `git diff -- tsconfig.json` dans pilot-ai
2. ADR 0014 : committer telle chose OU restaurer. Aucun tsconfig.json modifié non committé dans baseline
3. `git rev-parse HEAD` ×2 → `docs/pilot-platform/reports/01-baseline.md`

**Comportement existant à préserver**: Toutes les résolutions de chemins tsconfig restent fonctionnelles pour la compilation Mastra.

### Sous-étape 1 — Package de contrats partagé (AC-01-02)

**Objectif**: Un seul module de contrats versionné, source unique, sans @mastra/* ni process.env.

**Fichiers à créer**:

- `pilot-ai/src/conversation/contract.ts` — module PUR avec:
  - `PILOT_CONVERSATION_MODEL_ID = "kilo/kilo-auto/free" as const` (allowlist dev; plan 04 → registre)
  - `generateConversationReplySchema` (déplacée depuis command.ts; modelId = `z.literal(PILOT_CONVERSATION_MODEL_ID)`)
  - `type GenerateConversationReply`
  - Helpers purs : `createConversationResourceId`, `createProjectResourceId`, `createMemoryResourceId`
  - Constantes : `ALLOWED_TOOL_IDS`, `BASE_AGENT_IDS`
  - Aucun import @mastra/*, aucune lecture process.env

**Fichiers à modifier**:

- `pilot-ai/src/conversation/command.ts` → réexporte le contrat (`export * from "./contract.js"`) ; retire l'import config.ts
- `pilot-ai/src/conversation/openai-compatible.ts` → `chatCompletionRequestSchema` et `modelId` utilisent `PILOT_CONVERSATION_MODEL_ID` du contrat (plus de config.ts)
- `pilot-ai/src/conversation/config.ts` → conserver maxRetries/maxSteps/tokenLimit/lastMessages ; retirer modelId (le contrat est l'autorité)
- `pilot/src/ai/pilot-ai-client.ts` → importer `generateConversationReplySchema`/`GenerateConversationReply` depuis `@pilot/conversation-contracts` (version pinnée) ; supprimer le `generateConversationRequestSchema` redondant. Consommation Pilot croisée → conditionnée à publication (BLOCAC sinon, ADR 0013). Le client garde ses schémas de réponse OpenAI (wire, pas DTO commande).

**Comportement existant à préserver**: Toutes les fonctions qui consomment `conversationRuntimeConfig.maxRetries`, `maxSteps`, `tokenLimit`, `lastMessages` continuent d'importer `config.ts` (ces propriétés restent dans config.ts).

**Fichiers dépendants à mettre à jour** (même si non listés dans le plan, nécessaires pour la compilation):

- `pilot-ai/src/conversation/pilot-conversation.test.ts` — utilise `PILOT_CONVERSATION_MODEL_ID` de contract.ts au lieu de `conversationRuntimeConfig.modelId` de config.ts
- `pilot-ai/src/conversation/verify-memory.ts` — même mise à jour
- `pilot-ai/src/runtime/memory/project-memory.ts` — `observationalMemory.model` utilise `PILOT_CONVERSATION_MODEL_ID` de contract.ts

### Sous-étape 2 — Tests du contrat (AC-01-02)

**Objectif**: Prouver que contract.ts compile un consommateur de DTO sans @mastra ni process.env.

**Fichiers à créer**:

- `pilot-ai/src/conversation/contract.test.ts` — 12 tests couvrant:
  - `PILOT_CONVERSATION_MODEL_ID` est le modèle allowlisté
  - `ALLOWED_TOOL_IDS` correspond à l'ensemble production
  - `BASE_AGENT_IDS` correspond aux bases du catalogue
  - Parse un `GenerateConversationReply` valide
  - Rejette un modèle non allowlisté (openai/gpt-5)
  - Rejette un outil non allowlisté (stagehand-browser)
  - Rejette toolApprovalMode sans outils autorisés
  - Accepte l'ensemble complet d'outils production (web-search, scratchpad, ask-user)
  - `createConversationResourceId` scope par organization + worker
  - `createProjectResourceId` inclut le project
  - `createMemoryResourceId` utilise project resource uniquement quand sharedMemoryEnabled=true
  - Import graph : contract.ts ne transporte pas @mastra ni process.env (assertion sur le contenu source)

- `pilot/tests/contract-import.test.ts` — test BLOCAC :
  - Importe `@pilot/conversation-contracts` → attend une erreur (module non publié)
  - Marqué BLOCAC + condition dans le rapport, jusqu'à publication

### Sous-étape 3 — Doc de baseline + handoff (AC-01-01, AC-01-04)

**Fichiers à créer**:

- `docs/pilot-platform/adr-index.md` — index 0001–0014, statut, source, lien
- `docs/pilot-platform/reports/01-contradictions.md` — matrice de contradictions (9 items)
- `docs/pilot-platform/reports/01-baseline.md` — SHAs, migrations, routes, env, scripts/CI, tests (credential-gated)
- `docs/pilot-platform/reports/01-result.md` — SHA avant/après, fichiers changés, migrations/env, AC-01-01..04 PASS/FAIL/BLOCAC + preuves, rollback, "le plan 02 peut-il commencer"
- `docs/decisions/0012-runtime-verified-state.md` — ADR 0012
- `docs/decisions/0013-shared-contracts-package.md` — ADR 0013
- `docs/decisions/0014-planning-baseline-clean.md` — ADR 0014

**Fichiers à modifier**:

- `pilot/KILOCODE_HANDOFF.md` → §5/§7 SUPERSEDED ; retirer `/Users/hsaddek/.codex/...` ; pointer vers ce plan + AGENTS.md
- `docs/decisions/0004-mastra-conversation-runtime-contract.md` → statut : « implémenté pour web-search/scratchpad/ask-user ; fail-closed pour le reste »

### Sous-étape 4 — Vérification (AC-01-03)

Environnement isolé (pas de prod):

**pilot**:

- `pnpm check` → lint + typecheck + format:check + knip
- `pnpm build` → Next.js build
- `pnpm test` → playwright (BLOCATED : WorkOS hébergé)
- `pnpm test:server` → tsx --test (certains tests peuvent exiger OIDC runtime + LLM → BLOCATED)
- `pnpm test:db` → Neon dev (BLOCATED : credential requis)
- `pnpm audit --audit-level high`
- `git diff --check`

**pilot-ai**:

- `pnpm typecheck` → tsc --noEmit
- `pnpm build` → mastra build
- `pnpm test` → vitest run
- `pnpm knip --production`

**Tests BLOCATED à marquer**:

- pilot : test:db (Neon dev), test playwright (WorkOS hébergé), test:server (peut exiger OIDC runtime + LLM)
- pilot-ai : evals (eval*, verify:memory, pilot-browser.eval.test.ts) nécessitent TURSO_*, LANGSEARCH_API_KEY, BROWSERBASE_API_KEY, KILO_API_KEY

**Capturer**: commande + résultat exact par check → `01-result.md`.

**Aucune mise à jour globale de dépendances.** Erreur préexistante documentée + corrigée dans une sous-étape bornée.

### Sous-étape 5 — Handoff portable (AC-01-04)

**Fichiers à créer**:

- `docs/pilot-platform/reports/01-result.md` : SHA avant/après, fichiers changés, migrations/env, AC-01-01..04 PASS/FAIL/BLOCAC + preuves, rollback, "le plan 02 peut-il commencer : oui/non"

**Critères**:

- Aucun fichier requis hors dépôt
- Plan 02 à `sdk-pilot-blueprint/plans/02-identity-policy.md` (dans le checkout)
- Indiquer si la dépendance du plan 02 est satisfaite

## Tests et assertions requis

### AC-01-01 — docs-baseline

- Chaque affirmation "implémenté" → fichier:symbole vérifiable
- Chaque affirmation "vérifié" → résultat daté
- Matrice de contradictions avec décision, source et conséquence

### AC-01-02 — contract-import

- `pilot-ai/src/conversation/contract.ts` compile un consommateur de DTO sans @mastra ni process.env
- `contract.test.ts` assertion d'import-graph (ligne 119–129 du test)
- Consommateur Pilot inter-repo → BLOCAC publication (documenté dans pilot-ai-client.ts TODO et contract-import.test.ts)

### AC-01-03 — baseline-checks

- Scripts réels exécutés (typecheck, tests, git diff --check)
- Tests dépendant de credentials marqués "non exécutés" + condition
- pilot typecheck : 0 erreurs sur les fichiers du plan
- pilot-ai typecheck : 0 erreurs sur les fichiers du plan (19 erreurs préexistantes dans src/research/* non liées)

### AC-01-04 — handoff-portability

- Nouvelle session retrouve plan 02 sans fichier hors dépôt
- Chemin local du handoff neutre (pas de `/Users/hsaddek/...`)

## Comportement existant à préserver

| Comportement           | Preuve                                                      | Action                                           |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| WorkOS auth dans pilot | AuthKit + Node SDK dans pilot                               | Préserver tel quel                               |
| OIDC Pilot→runtime     | `pilot-ai/src/runtime/auth/vercel-oidc.ts`                  | Préserver tel quel                               |
| Runtime surface        | `pilot-ai/src/conversation/api/index.ts` (5 routes)         | Préserver tel quel                               |
| Chats exécutables      | `pilot-runtime.ts` (LibSQLStore + TURSO_*)                  | Confirmer, ne pas revenir en arrière             |
| Outils bornés          | `agent-configuration.ts` (web-search, scratchpad, ask-user) | Confirmer, ne pas ajouter d'outils non approuvés |
| Contrats de données    | Drizzle 0000–0019, journal conservé                         | Aucune modification de migrations                |
| DTO pilot-ai-client    | Schémas de wire OpenAI dans pilot-ai-client.ts              | Garder (pas de DTO commande côté Pilot)          |

## Contrats et migrations

### Migrations (Drizzle)

- `pilot/drizzle/meta/_journal.json` : 0000–0019, tous committés, applied dev/preview/prod Neon
- Schema `src/db/schema.ts` reflète 0000–0019 incluant conversation_attachments(0016), conversation_scratchpads(0017), user_question_options(0018), project_files(0019)
- **Aucune modification** de migrations historiques ; hashes du journal conservés

### Contrat DTO

- Source unique : `pilot-ai/src/conversation/contract.ts`
- Consommation pilot : BLOCAC tant que `@pilot/conversation-contracts` non publié (ADR 0013)
- Consommation pilot-ai interne : via re-export `command.ts` → `contract.ts`

## Autorisation et isolation tenant

| Principe                                 | Implémentation                                                       |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Auth WorkOS                              | AuthKit + Node SDK dans pilot                                        |
| Auth Pilot→runtime                       | Vercel OIDC dans `pilot-ai/src/runtime/auth/vercel-oidc.ts`          |
| Isolation private chat                   | `organizationId + createdByWorkosUserId` partout                     |
| Outils approuvés                         | web-search, scratchpad, ask-user (production)                        |
| Outils fail-closed                       | langsearch, browser, file-analysis, github (availableFor:[])         |
| Pas d'import domaine Pilot dans pilot-ai | Contract vérifié par assertion d'import graph                        |
| Pas de secret dans contrat               | `PILOT_CONVERSATION_MODEL_ID` = constante allowlist, pas process.env |

## Risques et goulets

| Risque                              | Impact                                                                                                               | Mitigation                                                     |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Drift contractuel                   | Si command.ts/pilot-ai-client.ts divergent de openai-compatible.ts, plan 02 peut casser la préparation d'approbation | contract.test.ts + pilot-ai-stream.test.ts                     |
| tsconfig non résolu                 | pilot-ai/tsconfig.json instable casse pnpm typecheck                                                                 | ADR 0014 bloquant (commité)                                    |
| Publication inter-repo              | Consommateur Pilot reste BLOCAC tant que package non publié                                                          | Documenté, ne pas contourner par workspace link                |
| pilot-ui/pilot-integrations absents | progress.md:247 parle de "package stubs"                                                                             | INEXISTANT (bloqué) — préparer contrat dans dépôts disponibles |

## Vérifications et sortie

### Commandes de vérification

**pilot** (dans `pilot/`):

```sh
pnpm check
pnpm build
pnpm test
pnpm test:server
pnpm test:db
pnpm audit --audit-level high
git diff --check
```

**pilot-ai** (dans `pilot-ai/`):

```sh
pnpm typecheck
pnpm build
pnpm test
pnpm knip --production
```

### Tests nommés à créer/rattacher

| Test                       | Emplacement                                          | Type                |
| -------------------------- | ---------------------------------------------------- | ------------------- |
| contract.test.ts           | pilot-ai/src/conversation/contract.test.ts           | runtime             |
| contract-import.test.ts    | pilot/tests/contract-import.test.ts                  | BLOCAC (cross-repo) |
| pilot-conversation.test.ts | pilot-ai/src/conversation/pilot-conversation.test.ts | runtime (existant)  |
| openai.vercel.test.ts      | pilot-ai/src/conversation/openai.vercel.test.ts      | runtime (existant)  |
| pilot-runtime-oidc.test.ts | pilot/src/ai/pilot-runtime-oidc.test.ts              | server (existant)   |

### Ce qui doit être écrit dans le result report

- SHA avant/après pour chaque repo
- Fichiers changés (liste exhaustive)
- Migrations appliquées et environnement (0000–0019, aucune modification)
- AC-01-01..04 PASS/FAIL/BLOCKED avec commandes et preuves
- Limites (tests BLOCATED, dépendances non satisfaites)
- Procédure de retour testée (rollback aux fichiers documentaires/exports)
- "Build vert" ne prouve pas login, reprise durable ou permissions
- Indication explicite si le plan 02 peut commencer

## Rollout et récupération

- Tous les changements plan 01 sont documentaires ou types/exports
- Revenir aux seuls changements documentaires/exports si un consommateur casse
- Aucune modification de production
- Aucune migration de données

## Hors périmètre (strict)

- Pas de nouvelle fonctionnalité, refonte générale, migration Turso→Neon
- Pas de registre modèle/provider (plan 04), i18n (plan 06), shell (plan 07), runtime conversation (plan 08), approvals nouveaux (plan 10)
- Pas de création pilot-ui/pilot-integrations
- Pas de publication npm réelle (ADR 0013 la décrit ; publication = condition du blocage inter-repo)

# Plan 07 — Shell et pages fondamentales du produit

**Scope**: Plan 07 ONLY. Build upon verified Plans 01-06.

**State**: Toutes les routes workspace existent. Sidebar manque Tâches. Pas de loading.tsx. Settings n'utilise pas uiLocale. Pas de search. Pas de liens conversation dans Tasks.

## Invariants

- Conserver /workspace comme entrée et URLs existantes
- Navigation ne crée pas de destinations sans comportement réel
- Tout texte UI vient de l'i18n dès qu'elle est disponible
- Un chat privé reste privé (filtrage par createdByWorkosUserId partout)
- Recherche globale retourne seulement titres/extraits autorisés

## État actuel vs besoins

| Élément                                         | Status         | Action                                     |
| ----------------------------------------------- | -------------- | ------------------------------------------ |
| `src/components/agents/agent-fleet-sidebar.tsx` | EXISTE         | Ajouter Tâches, organiser zone Paramètres  |
| `src/app/workspace/layout.tsx`                  | EXISTE         | Passer uiLocale au shell                   |
| `src/app/workspace/error.tsx`                   | EXISTE         | Réutiliser                                 |
| `src/app/workspace/page.tsx`                    | EXISTE         | Vide org → action réaliste ✓               |
| `src/app/workspace/chats/page.tsx`              | EXISTE         | Ajouter search, pagination framework       |
| `src/app/workspace/tasks/page.tsx`              | EXISTE         | Ajouter lien conversation, meilleur statut |
| `src/app/workspace/settings/page.tsx`           | EXISTE         | Ajouter langue (uiLocale)                  |
| `src/app/workspace/dashboard/page.tsx`          | EXISTE         | Conservation données réelles ✓             |
| `src/app/workspace/approvals/page.tsx`          | EXISTE         | Inbox filtrée ✓                            |
| `src/app/workspace/fleet/page.tsx`              | EXISTE         | Redirect vers Personas ✓                   |
| Loading states                                  | N'EXISTENT PAS | Créer loading.tsx pour workspace           |
| Tests AC-07                                     | N'EXISTENT PAS | Créer 4 fichiers de test                   |

## Implémentation ordonnancée

### Sous-étape 1 — Sidebar navigation

**Fichier à modifier**: `pilot/src/components/agents/agent-fleet-sidebar.tsx`

- Ajouter **Tâches** (/workspace/tasks) dans le groupe Workspace (après Chats)
- Organiser footer: Dashboard, Approvals, Tasks (boutons autorisés seulement)
- Settings zone: maintenir liens vers Personas, Dashboard, Approvals
- Garder Chat history (récents) et AccountMenu

### Sous-étape 2 — Workspace loading states

**Fichiers à créer**:

- `src/app/workspace/loading.tsx` — Indicateur de chargement workspace
- `src/app/workspace/tasks/loading.tsx` — Loading pour tâches
- `src/app/workspace/chats/loading.tsx` — Loading pour chats

### Sous-étape 3 — Settings langue (connect Plan 06)

**Fichier à modifier**: `pilot/src/app/workspace/settings/page.tsx`

- Ajouter section Langue avec les locales du registre (FR/EN/AR)
- Utiliser `preferences.uiLocale` comme valeur actuelle
- Action de mise à jour (foundation uniquement — pas de persistance DB)
- Passer uiLocale à AgentFleetShell via layout

### Sous-étape 4 — Chats page search

**Fichier à modifier**: `pilot/src/app/workspace/chats/page.tsx`

- Ajouter barre de search par titre
- Filtrer côté serveur: conversations de l'org du user uniquement
- Résultats: titres autorisés seulement, pas données d'autres membres

### Sous-étape 5 — Tasks page improvements

**Fichier à modifier**: `pilot/src/app/workspace/tasks/page.tsx`

- Sélectionner aussi `conversationId` dans listTasks
- Afficher lien vers conversation quand conversationId existe
- Pas de faux pourcentages ✓ (déjà)
- Statut affiché tel quel (ready, in_progress, done etc.)

### Sous-étape 6 — AC Tests

**Fichiers à créer**:

- `pilot/tests/workspace-navigation.spec.ts` — AC-07-01: New chat → Project → conversation → task → approval sans impasse
- `pilot/tests/workspace-private-search.integration.test.ts` — AC-07-02: titre secret B absent résultats A
- `pilot/tests/workspace-responsive.spec.ts` — AC-07-03: 390/768/1440, clavier, retour, brouillon
- `pilot/tests/workspace-empty.spec.ts` — AC-07-04: org vide guide vers action réaliste sans données démo

## Tests et critères d'acceptation spécifiques

- **AC-07-01** — workspace-navigation.spec: parcours New chat → Project → conversation → task → approval sans impasse
- **AC-07-02** — workspace-private-search.integration.test: titre secret de B absent du résultat, compteurs et suggestions de A
- **AC-07-03** — workspace-responsive.spec: 390/768/1440, clavier, bouton retour et brouillon conservé
- **AC-07-04** — workspace-empty.spec: organisation vide guide vers une action réalisable sans créer de données démo

## Migration et compatibilité

Aucune migration de données. Conserver routes workers/.../conversations/... et liens profonds. Sidebar ajoute Tasks — pas de changement de route existante.

## Hors périmètre

- Pas de moteur d'exécution nouveau
- Pas de dashboard analytique sans données
- Pas de duplication de pages existantes
- Pas de 3-zone layout rework majeur (la structure sidebar/workspace/details existe déjà via AgentFleetShell + ConversationDetailsPanel)
- Pas de Connections/Usage pages dédiées (pas de comportement réel)

## Vérifications et sortie obligatoire

Commandes:

- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `git diff --check`
- Créer les 4 tests AC nommés

Met à jour `docs/progress.md`, `docs/pilot-platform/reports/07-result.md`.

# Plan 05 — Branding Pilot. et fondations du design system

**Scope**: Plan 05 ONLY. Build upon verified Plans 01-04.

**State**: Le wordmark Pilot./P. existe déjà avec thème System/Light/Dark et composants shadcn locaux.

## Invariants

- Garder Pilot. et P.; le point utilise le token primary
- Tout texte UI vient de l'i18n dès qu'elle est disponible
- Nouvelles surfaces: FR/EN/AR, RTL, clavier, états non heureux
- Pas de changement de données ou routes

## État actuel vs besoins

| Élément                                   | Statut       | Action                                    |
| ----------------------------------------- | ------------ | ----------------------------------------- |
| `src/components/brand/pilot-wordmark.tsx` | EXISTE       | Réutiliser                                |
| `src/app/globals.css`                     | EXISTE       | Documenter tokens                         |
| `src/components/theme/`                   | EXISTE       | Réutiliser theme-provider, theme-switcher |
| `src/components/ui/`                      | EXISTE       | Inventorier composants shadcn             |
| `src/components/ai-elements/`             | EXISTE       | Réutiliser conversation, message          |
| `src/app/layout.tsx`                      | EXISTE       | Réutiliser                                |
| `docs/decisions/0008-*.md`                | EXISTE       | Réutiliser ADR                            |
| Status state gallery                      | N'EXISTE PAS | Créer                                     |

## Implémentation ordonnancée

### Sous-étape 1 — Branding inventory

**Action**: Documenter le branding existant: wordmark, fontes, favicon, tokens.

**Fichiers à créer**:

- `pilot/src/components/brand/README.md` — Inventaire: Pilot./P. wordmark, JetBrains Mono, favicon, tokens OKLCH

### Sous-étape 2 — Token documentation

**Action**: Documenter les tokens sémantiques existants (background/surface/text/border/focus/status) et densités.

**Fichiers à créer**:

- `pilot/docs/design-tokens.md` — Documentation des tokens CSS existants dans globals.css

### Sous-étape 3 — Component catalog traceability

**Action**: Rendre le catalogue de composants traçable vers shadcn/AI Elements.

**Fichiers à créer**:

- `pilot/docs/components.md` — Catalogue: composants shadcn (button, card, input, etc.), AI Elements (conversation, message), versions et modifications locales

### Sous-étape 4 — Status state gallery

**Action**: Créer une galerie des états UI courants.

**Fichiers à créer**:

- `pilot/src/components/ui/status-states.tsx` — Composants pour: chargement (skeleton), vide initial (empty), aucun résultat, accès refusé (forbidden), indisponible (unavailable), erreur récupérable (error), hors ligne, partiel, en cours (loading), attente (waiting), terminé (success)
- Chaque état: texte + icône, jamais couleur seule; messages d'action concrets

### Sous-étape 5 — Accessibility documentation

**Action**: Documenter les prérequis a11y existants et vérifications.

**Fichiers à créer**:

- `pilot/docs/a11y.md` — Navigation clavier, focus, reduced-motion, contraste AA, cibles tactiles, liens accessibles

## Tests et critères d'acceptation spécifiques

- **AC-05-01** — design-system.spec: navigation clavier et focus visible (BLOCATED: Playwright/WorkOS)
- **AC-05-02** — theme.spec: préférence persistée (BLOCATED: Playwright/WorkOS)
- **AC-05-03** — brand.visual: captures light/dark (BLOCATED: Playwright/WorkOS)
- **AC-05-04** — a11y.spec: zéro violation grave/critique (BLOCATED: Playwright/WorkOS)

## Migration et compatibilité

Aucune donnée produit à migrer. Préserver les clés de préférence thème.

## Hors périmètre

- Pas de nouveau logo illustré
- Pas de rebranding non sourcé
- Pas de refonte de chaque page

## Vérifications et sortie obligatoire

Pour une tranche documentaire: contrôler liens/contrats et ne pas prétendre avoir validé le runtime.

**pilot**: `pnpm typecheck`, `git diff --check`
**pilot-ai**: `pnpm typecheck`, `pnpm test`

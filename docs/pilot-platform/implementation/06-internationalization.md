# Plan 06 — Internationalisation intégrale et langues extensibles

**Scope**: Plan 06 ONLY. Build upon verified Plans 01-05.

**State**: No complete i18n system exists. All text is English. Need to build foundation.

## Invariants

- UI preference: user choice > org default > Accept-Language > fallback
- Agent response: explicit request > chat preference > user preference; never translate original message text
- Don't translate IDs, code, paths, or user content automatically
- FR/EN complete; AR as third tested RTL pack

## State current vs needs

| Element                                           | Status         | Action                                      |
| ------------------------------------------------- | -------------- | ------------------------------------------- |
| `src/users/user-preferences.ts`                   | EXISTE         | Add `uiLocale` field                        |
| `pilot-ai/src/runtime/agent/base-instructions.ts` | EXISTE         | English only; preserve for now              |
| `src/agents/agent-configuration.ts`               | EXISTE         | English descriptions; extract to keys later |
| i18n library                                      | N'EXISTE PAS   | Add next-intl (if compatible) or custom     |
| Locale registry                                   | N'EXISTE PAS   | Create                                      |
| Message files                                     | N'EXISTENT PAS | Create                                      |

## Implémentation ordonnancée

### Sous-étape 1 — Library selection & locale definition

**Fichiers à créer**:

- `pilot/src/i18n/locale-definition.ts` — LocaleDefinition type:
  - tag (BCP-47), nativeName, direction, fallback, status, coverage
  - FR/EN complete, AR RTL complete

### Sous-étape 2 — Locale registry

**Fichiers à créer**:

- `pilot/src/i18n/locale-registry.ts` — Registry:
  - `listLocales()` — all defined locales
  - `getLocale(tag)` — get by BCP-47 tag
  - `isLocaleComplete(tag)` — check if fully translated

### Sous-étape 3 — Message extraction foundation

**Fichiers à create**:

- `pilot/src/i18n/messages.ts` — Base message keys structure:
  - Common: greeting, error, loading, empty, save, cancel, delete, edit
  - Auth: login, logout, unauthorized, forbidden
  - UI: save, cancel, close, done, skip, next, back

### Sous-étape 4 — User preference locale

**Fichiers à modifier**:

- `pilot/src/users/user-preferences.ts` — Add `uiLocale` field (BCP-47 tag, nullable)

### Sous-étape 5 — RTL preparation

**Fichiers à create**:

- `pilot/src/i18n/direction.ts` — Direction utilities:
  - `isRTL(tag)` — check if tag is RTL
  - `getDirection(tag)` — return "ltr" | "rtl" | "auto"

## Tests et critères d'acceptation spécifiques

- **AC-06-01** — i18n-coverage: no missing keys in FR/EN/AR
- **AC-06-02** — locale.spec: switch language preserves route, draft, theme
- **AC-06-03** — rtl-ime.spec: AR 390px, mixed text/code, keyboard, IME
- **AC-06-04** — runtime-language.eval: same tasks FR/EN/AR respond in requested language

## Migration et compatibilité

Ajouter ui_locale nullable dans user_preferences; backfill uniquement le défaut existant, conserver l'absence de choix explicite.

## Hors périmètre

- Pas de promesse "toutes les langues relues"
- Pas de traduction automatique des données clients
- Pas de changement de texte existant (anglais reste par défaut)

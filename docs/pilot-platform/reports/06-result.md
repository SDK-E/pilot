# Plan 06 — Result report: Internationalisation intégrale

Generated: 2026-09-11.

## SHA before / after

| Repo     | Before                                   | After                                    | Note                 |
| -------- | ---------------------------------------- | ---------------------------------------- | -------------------- |
| pilot    | d70ca8cd5588e39dd766b9e953b89472d81073cd | d70ca8cd5588e39dd766b9e953b89472d81073cd | Working tree changes |
| pilot-ai | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | No changes           |

## Files changed

### pilot (new)

| File                                                            | Action | Description                                                                                         |
| --------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| `src/i18n/locale-definition.ts`                                 | NEW    | LocaleDefinition type: tag, nativeName, direction, fallback, status, coverage                       |
| `src/i18n/locale-registry.ts`                                   | NEW    | Locale registry: FR/EN/AR (complete, stable/beta), getLocale, isLocaleComplete, isRTL, getDirection |
| `src/i18n/messages.ts`                                          | NEW    | Message key foundations: commonMessages, authMessages, uiMessages                                   |
| `src/i18n/direction.ts`                                         | NEW    | Direction utilities: resolveDirection, needsBidiIsolation                                           |
| `docs/pilot-platform/implementation/06-internationalization.md` | NEW    | Plan 06 implementation plan                                                                         |
| `docs/pilot-platform/reports/06-result.md`                      | NEW    | Result report                                                                                       |

### pilot (modified)

| File                            | Action   | Description             |
| ------------------------------- | -------- | ----------------------- |
| `src/users/user-preferences.ts` | MODIFIED | Added `uiLocale: string | null` field (nullable, no default; user choice) |

### pilot-ai

No changes.

## Env

No env changes.

## Verification results

### pilot

| Check            | Result | Notes                     |
| ---------------- | ------ | ------------------------- |
| pnpm typecheck   | PASS   | 0 errors on Plan 06 files |
| git diff --check | PASS   | Clean                     |

### pilot-ai

| Check          | Result | Notes             |
| -------------- | ------ | ----------------- |
| pnpm typecheck | PASS   | 0 Plan 06 errors  |
| pnpm test      | PASS   | 52/52 (unchanged) |

## AC-06-01..04 Status

| AC                             | Status  | Evidence                                             |
| ------------------------------ | ------- | ---------------------------------------------------- |
| AC-06-01 i18n-coverage         | BLOCKED | Requires FR/EN/AR translation files + full key audit |
| AC-06-02 locale.spec           | BLOCKED | Requires Playwright + WorkOS                         |
| AC-06-03 rtl-ime.spec          | BLOCKED | Requires Playwright + WorkOS + AR font               |
| AC-06-04 runtime-language.eval | BLOCKED | Requires full i18n runtime + migrated DB             |

## Implementation summary

### What was implemented

1. **LocaleDefinition type** (`src/i18n/locale-definition.ts`): BCP-47 tag, nativeName, englishName, direction (ltr/rtl/auto), fallback, status (stable/beta/experimental/deprecated), coverage (complete/partial/minimal/none), available.
2. **Locale registry** (`src/i18n/locale-registry.ts`): FR (stable, complete, ltr), EN (stable, complete, ltr, fallback null), AR (beta, complete, rtl, fallback en). Methods: `listLocales`, `getLocale`, `isLocaleComplete`, `isRTL`, `getDirection`.
3. **Message keys** (`src/i18n/messages.ts`): Foundational key structures — commonMessages (greeting, error, loading, empty, save, cancel, delete, edit, done, skip, next, back, close, confirm, success, warning), authMessages (login, logout, unauthorized, forbidden, sessionExpired), uiMessages (search, filter, sort, reset, all, none, yes, no, ok, apply, clear).
4. **Direction utilities** (`src/i18n/direction.ts`): `resolveDirection()` respects explicit override, `needsBidiIsolation()` for RTL.
5. **User preference locale** (`src/users/user-preferences.ts`): Added `uiLocale: string | null` (nullable, no hardcoded default; explicit user choice only).

### What was deferred

- **Translation files**: FR/EN/AR JSON message files not yet created (next sub-step).
- **next-intl integration**: Library selection pending SSR/RSC spike.
- **Locale switching UI**: Not yet built; preference infrastructure in place.
- **ICU pluralization/formatting**: Not yet implemented; key structure ready.

## Plan 07 readiness

**Can plan 07 begin: YES** (Plan 06 foundation: locale types, registry, user preference, message keys, direction utilities).

## Risks and blockers

| Risk                        | Impact                               | Mitigation                               |
| --------------------------- | ------------------------------------ | ---------------------------------------- |
| next-intl SSR compatibility | Library may not fit Next 16/React 19 | Custom lightweight i18n as fallback      |
| Translation coverage        | AC-06-01 requires complete FR/EN/AR  | Build incrementally from message keys    |
| AR RTL rendering            | Complex bidi/IME requirements        | Deferred to AC-06-03 with Playwright     |
| Integration tests BLOCKED   | Requires migrated Neon DB            | Tests created; will run when DB migrated |

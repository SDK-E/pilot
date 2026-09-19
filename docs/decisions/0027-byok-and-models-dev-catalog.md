# BYOK credentials and a models.dev catalog sync

Status: implemented on 2026-09-19.

## Context

Two related asks: let a member plug in their own provider API key (used
explicitly, or automatically once their platform usage allowance is
exhausted), and source provider/model metadata dynamically from
[models.dev](https://models.dev/providers/) rather than a hardcoded list —
matching the "prefer dynamic over hardcoded" rule this codebase already
applies to connectors and gateways.

`model_gateways` (ADR-0024) already proved the encrypted, DB-backed,
per-call-resolved credential pattern this needed — but it is platform-admin
data end to end (`requireSuperadmin`, every read path assumes an org-wide
row). A personal credential is a different trust tier, so it gets its own
table rather than a nullable owner column bolted onto `model_gateways`,
which would have forced re-auditing every existing read for a scope-leak
risk it was never built to guard against.

## Decision

**`catalog_providers`/`catalog_models`** (`src/db/schema/models-catalog.ts`):
a read-only mirror of `https://models.dev/api.json`, synced daily by
`/api/cron/sync-models-catalog` (`src/models-catalog/sync-models-catalog.ts`,
same `isVerifiedCronRequest` bearer-token auth as every other cron route).
Each row keeps a `raw` jsonb column alongside the fields the app actually
reads — the same "absorb upstream fields without a migration per new one"
move `connector_definitions.actions` already made. A model that disappears
upstream is left in place, not cascade-deleted, since a hard delete could
silently break a `byokCredentials.allowedModelIds` reference that still
names it.

**`byok_credentials`** (`src/db/schema/byok-credentials.ts`,
`src/byok/byok-repository.ts`): one member's own encrypted provider key —
`organizationId`, `createdByWorkosUserId` (the only user who may
read/use/edit/delete it), `providerId` (FK to the catalog), `baseUrl`
(defaults from the catalog, user-overridable), `apiKeyCiphertext`/`Iv`/
`AuthTag` (reusing `gateway-secret.ts`'s AES-256-GCM helpers verbatim — same
trust tier as a platform gateway key, no new key or module), and
`allowedModelIds` (empty means every model the provider's catalog entry
lists). Selector format `byok:<credentialId>:<modelId>`, deliberately
namespaced apart from `model_gateways`' own `gw:<gatewayId>:<modelId>` so
`resolveWorkerModel` (`runtime-request.ts`) can dispatch on the prefix
without the two ever colliding.

**`usage_limits`** (`src/db/schema/usage-limits.ts`,
`src/usage/usage-limit-repository.ts`): an append-only `usageEvents` ledger
(one row per completed turn, `source: "platform" | "byok"`) with both
windows — 5-hour and weekly — computed at read time
(`created_at >= now() - interval`) rather than pre-aggregated counters, to
avoid the reset-boundary/clock-skew bugs a counter design would carry; cheap
to sum per-user at this scale. `usage_limit_policies` is per-organization,
admin-set, defaulting to unlimited. Only `source: "platform"` rows count
against a policy — BYOK usage is the member's own cost and is never
metered, which is exactly what makes it a legitimate fallback.

**Composition** (`src/conversations/model-plan.ts`'s `resolveModelPlan`):
an explicit per-message BYOK pick always wins outright, with no silent
platform fallback behind it — choosing your own key is the point. An
explicit platform-model pick keeps today's `retryEnabled` fallback shape.
With no override, an exhausted platform allowance substitutes an enabled
BYOK credential for the org's `primaryModelId` before `retryEnabled`
applies. This sits inside the existing per-attempt loop in
`conversation-turn.ts`, so it composes with ADR-0026's chunked continuation
for free — a continuation chunk re-derives its plan the same way a fresh
turn does.

## Consequences

- The Composer's model picker (`model-picker.tsx`) is the first UI in this
  app to merge three different sources — `model_gateways`, `byok_credentials`,
  and the usage-limit state — behind one `/api/models/selectable` endpoint,
  so the client never merges shapes itself.
- A models.dev outage or schema change only stales the catalog mirror; it
  never blocks a turn, since `resolveModelPlan`/`resolveWorkerModel` never
  call out to models.dev directly.
- BYOK credential mutations (`byok-actions.ts`) check
  `session.user.id === credential.createdByWorkosUserId` on every write —
  this is personal-scope data, unlike the two existing tables its shape
  mirrors, and must never be reachable by an org admin who isn't its owner.

# Dynamic connectors

Status: implemented on 2026-09-17. Supersedes
[ADR-0021](./0021-connectors.md): the 8 hand-written provider/adapter files
it introduced (`src/connectors/providers/*`, `src/connectors/adapters/{github,
gmail,google-drive,linear,monday,notion,slack,vercel}.ts`), the 8 fixed
connector tool ids, and the `connector_connections` table are all removed.

## Decision

Every connector — GitHub, Slack, or one an admin adds from scratch — is now
a row in `connector_definitions`, driven by one generic OAuth2 + REST engine
instead of per-provider TypeScript code. Agents get one tool, `connector`
(`pilot-ai/src/mastra/tools/connectors/connector.ts`), instead of 8 fixed
ones. This is a direct response to feedback during ADR-0021's follow-up
work: connectors needed to be admin-configurable from Settings — add,
update, remove, with an icon — not hardcoded, and the existing 8 built-in
providers needed to move onto that same system rather than living beside it
as a special case.

## Mechanism

- **Schema**: `connector_definitions` (`src/db/schema/connector-definitions.ts`)
  is both a connector's configuration (OAuth endpoints, scopes, client
  id/secret, an `actions` array) and, once connected, its single
  organization-wide OAuth connection — one row, no separate connections
  table. Connectors are org-wide only; there is no personal-scope variant
  (unlike ADR-0021's built-ins, which let a member connect their own
  account). `actions` is `ConnectorDefinitionAction[]`: each action is
  `{ id, label, description, method, urlTemplate, bodyTemplate?, listPath?,
nextCursorPath?, idField?, titleField?, urlField? }` — a declarative REST
  call with `{param}` placeholders substituted from the tool call's params.
- **Generic OAuth** (`src/connectors/base-connector.ts`): one
  `exchangeDefinitionCode`/`refreshDefinitionToken`/`fetchDefinitionAccountIdentifier`/
  `buildDefinitionAuthorizeUrl` implementation, parameterized by a
  definition's stored config, replaces what was 8 separate
  `ConnectorProvider` implementations.
- **Generic action execution** (`src/connectors/adapters/base-connector-adapter.ts`):
  `runConnectorDefinitionAction` looks up an action by id in the
  definition's `actions`, substitutes params into the URL/body template,
  calls the REST API, and shapes the result generically (`id`/`title`/`url`
  pulled from configurable field names, list results capped and read from a
  configurable `listPath`). One file now does what 8 hand-written adapters
  did.
- **OAuth routes**: `/api/connectors/custom/[definitionId]/authorize` and
  `/callback` (the `custom` segment is a naming leftover from this being
  built as a bolt-on before becoming the only connector system — harmless,
  not worth a second rename pass right now). Signed state
  (`src/connectors/oauth-state.ts`) carries a `connectorDefinitionId`
  instead of a fixed `providerId`.
- **Runtime dispatch**: `POST /api/runtime/connectors/execute`
  (`src/app/api/runtime/connectors/execute/route.ts`) is now a thin
  wrapper around `dispatchCustomConnector`
  (`src/connectors/dispatch-custom-connector.ts`) — no more branching
  between "built-in" and "custom" dispatch paths. `list-connectors` is a
  meta-action needing no connection; every other call names a connector by
  `connectorSlug`.
- **Structured errors** (`src/connectors/connector-error.ts`, unchanged from
  its introduction alongside this work): `ConnectorError` carries a `kind`
  (`invalid-input`/`auth-required`/`authorization-denied`/`not-found`/
  `conflict`/`rate-limited`/`unavailable`/`unknown`) mapped to a distinct
  HTTP status, instead of one generic 502 for every failure.
- **Admin CRUD UI**: `src/components/settings/connectors-section.tsx` +
  `connector-definition-form.tsx`, backed by Server Actions in
  `src/app/(workspace)/settings/connector-actions.ts` — create, edit
  (client secret optional on update), enable/disable, disconnect, delete.
  Every mutation re-checks the caller is an org owner/admin
  (`requireAdmin()`), never trusting a rendered list.
- **Seeding Pilot's own connectors**: `src/connectors/connector-seed-definitions.ts`
  holds GitHub/Slack/Notion/Linear/Vercel/Monday as plain
  `ConnectorSeed` data (best-effort API shapes, not yet verified against
  live traffic — the same caveat ADR-0021's adapters carried). An admin
  triggers `seedDefaultConnectorsAction` from Settings (never an automatic
  side effect of loading the page — mutations only happen from an explicit
  action); it inserts one `connector_definitions` row per seed a platform
  admin has configured credentials for (`connector_provider_credentials`,
  see ADR-0024), and is a no-op if the org already has any connector. Once
  seeded, each row is ordinary admin-editable/removable state — nothing
  about it is special after that point.
- **Tool contract**: `pilot-ai`'s `ALLOWED_TOOL_IDS` has one connector
  entry, `"connector"`, with two actions: `list-connectors` (discovery —
  slug, display name, icon, description, and action ids/descriptions for
  every active connector) and `call` (`connectorSlug` + `connectorAction` +
  `params`). The model is expected to call `list-connectors` first in a
  conversation that hasn't already discovered what's available, since
  connector/action names are admin-defined and not knowable in advance.
- **Per-message toggle**: the composer's connector on/off toggle
  (`connector-toggle-menu.tsx`) collapsed from a per-provider checklist to
  one button, since there is only one tool now. The underlying plumbing
  (`requestedConnectorToolIds: string[] | undefined` on `TurnInput`, the
  `connector_tool_ids` jsonb column on `conversation_messages`) is
  unchanged — it just only ever holds `["connector"]` or `[]` now.
- **Write actions with in-conversation confirmation** (2026-09-17): an
  admin marks any action `isMutating: true`
  (`ConnectorDefinitionAction.isMutating`). `runConnectorDefinitionAction`
  (`base-connector-adapter.ts`) then never executes it on a bare call — it
  returns `{ confirmationRequired: true, action }` and does nothing else,
  no matter how many times it's called, until the caller passes
  `confirm: true` on the `execute/route.ts` request. The `connector` tool's
  `call` input carries `confirm?: boolean`; its `list-connectors` output
  marks each action's `isMutating` flag so the model can tell before ever
  calling it. This is the entire mechanism — no durable approval record,
  no second system, no revival of `ActionProposal`/`EffectIntent`
  ([[feedback_no_approvals_tasks]]): the model holding an unconfirmed
  result, and needing the user's explicit go-ahead (via `ask-user`) before
  it will ever set `confirm: true`, is the only state involved.

## Consequences

- **No personal connections for admin-managed connectors.** ADR-0021's
  "member connects their own account" model is gone; every connector here
  is one shared, org-wide connection. A future slice could add per-user
  connections if a real need shows up.
- **No true per-connector per-message narrowing.** With 8 fixed tool ids,
  a message could turn off just Gmail. With one dynamic tool, the
  composer's toggle is on/off for the whole `connector` tool; narrowing to
  "only Slack for this message" would need a second plumbing layer
  (e.g. an instruction-level constraint) that doesn't exist yet.
- **Seed data is unverified.** The 6 seeded connectors' `actions` (URL
  shapes, field names) are written from API documentation, not exercised
  against live traffic in this change — same caveat the ADR-0021 adapters
  shipped with. Verify before relying on one in production, and expect to
  edit a seeded connector's `actions` JSON to fix a wrong field name.
- **`connector_connections` table dropped** (migration `0044`). Any
  existing personal/org connections from ADR-0021 are gone; this is
  acceptable pre-launch (AGENTS.md: no real production data/users yet) —
  revisit if this ever needs to ship as a zero-downtime migration for real
  connected accounts.
- **No personal connections and no true per-connector per-message
  narrowing remain intentionally deferred** (not attempted in this pass):
  both are real product decisions — org-wide vs. per-user connection scope,
  and what a per-connector composer UI should look like — not mechanical
  gaps to close blind. Rushing either without the ability to exercise it
  against a real OAuth provider in this environment risked exactly the
  kind of half-tested change this system should avoid; they're left for a
  session where they can be designed and verified properly.
- **Seed data is still unverified against live traffic** for the same
  reason: this environment has no live OAuth credentials for GitHub,
  Slack, etc. to exercise against. Verify a seeded connector's `actions`
  (URL shapes, field names) before relying on it in production.

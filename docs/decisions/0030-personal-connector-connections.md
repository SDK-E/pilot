# Personal connector connections and per-message granularity

Status: implemented on 2026-09-18. Extends [ADR-0023](./0023-dynamic-connectors.md)
without reverting it: connectors are still one dynamic, admin-configurable
engine (`connector_definitions`), not per-provider code.

## Decision

ADR-0023 deliberately deferred two things: personal (per-member) connector
connections, and picking which connectors are usable per message instead of
an all-or-nothing toggle. Both ship now, using the same "personal-scope row
next to an org-scoped table" pattern this codebase already established for
BYOK credentials (`byok_credentials` next to `model_gateways`).

## Connection state moves to its own table again

ADR-0023 folded a connector's _connection_ state onto `connector_definitions`
itself and removed ADR-0021's separate `connector_connections` table,
because at the time there was only ever one connection per definition
(org-wide). That's no longer true — a definition can now have a shared
org-wide connection, any number of personal ones, or both — so connection
state needed to split back out. This isn't a revert of ADR-0023: the engine
is still one dynamic, generic table of connector _configuration_
(`connector_definitions`); only where _connection_ state lives changed, and
`base-connector.ts`'s OAuth exchange/refresh logic didn't change at all.

- `connector_definitions` gained one column, `allowPersonalConnections`
  (boolean, admin-set, default off) — never a hardcoded per-provider list;
  an admin decides per connector whether members may connect their own
  account, matching "prefer dynamic over hardcoded."
- New table `connector_connections`: `connectorDefinitionId`, `scope`
  (`"organization" | "personal"`), `ownerWorkosUserId` (null for
  `"organization"`), plus the encrypted-token columns
  `connector_definitions` used to hold directly. A partial unique index
  enforces at most one `"organization"` row per definition and at most one
  `"personal"` row per `(definition, owner)`.
- A one-time backfill migration (`drizzle/0054_violet_longshot.sql`) moved
  every definition's existing connection state into its own
  `"organization"`-scope row before the follow-up migration
  (`drizzle/0055_fair_molecule_man.sql`) dropped the now-unused columns from
  `connector_definitions`.
- `resolveConnectorConnection` (`src/connectors/connector-connection-resolve.ts`)
  picks the acting user's personal connection first when the definition
  allows personal connections, falling back to the org-wide one — never the
  reverse, since an explicit personal connection is the more specific
  choice. `hasActiveCustomConnector(organizationId, actingUserId)` is now
  user-aware for the same reason: an org with zero org-wide connections but
  where this user has their own personal one still counts.

## Per-message connector-slug granularity

The `connector` tool itself stays a single `ToolId` (`allowedToolIds` still
only turns it fully on or off via `requestedConnectorToolIds`); narrowing
_which_ connectors a message may use happens one layer down, at dispatch
time, not by inventing per-slug tool ids:

- The composer's connector picker (`connector-toggle-menu.tsx`) now offers a
  multi-select of individual connector slugs alongside its existing on/off
  toggle, threaded through as `requestedConnectorSlugs` on `TurnInput`.
- `startExecution` stores it on the new `executions.requestedConnectorSlugs`
  column (`null` = no restriction) — the execution row is the natural place
  for this since `/api/runtime/connectors/execute` only ever has an
  `executionId` to key off, the same reason `getRuntimeConversation` already
  derives every other piece of per-turn context from that table.
- `dispatch-custom-connector.ts` reads it back via `getRuntimeConversation`
  and filters both `list-connectors` and a direct action call against it.

## Settings

`ConnectorsSection` now renders for every member, not just admins: an admin
still manages configuration and the shared org-wide connection, but any
member can connect and disconnect their own personal connection to a
connector that allows it, without needing an admin role.

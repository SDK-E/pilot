# Platform-managed secrets

Status: implemented on 2026-09-18.

## Decision

Any number of platform-level connector providers — full OAuth2 + REST
configs, not just credentials for a fixed list — plus the GitHub
Marketplace webhook secret are platform admin-managed from Settings →
Admin → Connector providers, backed by two database tables. Adding,
editing, enabling/disabling, or removing a provider needs no deploy and no
Vercel dashboard access.

A small, fixed set of env vars remains, each load-bearing for a reason
that is independent of this system:

- `DATABASE_URL`(`_UNPOOLED`) — the database connection itself; nothing
  it points to can hold its own connection string.
- `WORKOS_API_KEY`/`WORKOS_CLIENT_ID`/`WORKOS_COOKIE_PASSWORD`/
  `NEXT_PUBLIC_WORKOS_REDIRECT_URI` — the auth system that gates every
  admin-managed setting, including these ones. A secret needed to read
  other secrets can't itself live behind the same gate.
- `WORKOS_M2M_AUTHKIT_DOMAIN`/`WORKOS_M2M_CLIENT_ID`/
  `WORKOS_M2M_CLIENT_SECRET`/`PILOT_AI_RUNTIME_URL` — which service to
  call and how to authenticate to it; deployment topology, not
  application configuration.
- `CONNECTOR_TOKEN_ENCRYPTION_KEY`, `CONNECTOR_STATE_SIGNING_SECRET`,
  `MODEL_GATEWAY_ENCRYPTION_KEY` — master keys that encrypt everything
  admin-managed, including the two tables here. A master key can't live
  in the database it protects.

`pilot-ai`'s own platform-level feature-flag circuit breakers
(`webSearchEnabled`/`codeSandboxEnabled`/`connectorsEnabled`, read from
Vercel Edge Config) are a deliberate exception too: they are a control
surface independent of Pilot's own database and admin panel by design
(see AGENTS.md), so that a compromised Pilot admin account can't also
control pilot-ai's own safety switch. Their independence is the point.

## Mechanism

- **`connector_providers`** (`src/db/schema/platform.ts`): one row per
  platform-level connector provider — the same shape as
  `connector_definitions` minus the per-org connection state (no account
  identifier, tokens, or connection status). Holds `slug`, `displayName`,
  `icon`, `description`, `authorizeUrl`, `tokenUrl`, `scopes`,
  `scopeDelimiter`, `clientId` plain, `clientSecret` AES-256-GCM
  encrypted with `CONNECTOR_TOKEN_ENCRYPTION_KEY` (`token-encryption.ts`,
  the same key and module connector OAuth tokens themselves use — same
  trust tier), `accountIdentifierUrl`/`accountIdentifierField`,
  `actions`, and `enabled`. `src/platform/connector-provider-repository.ts`
  is full CRUD (`createConnectorProvider`, `updateConnectorProvider`,
  `setConnectorProviderEnabled`, `deleteConnectorProvider`), plus
  `listEnabledConnectorProviders` — the decrypted, server-only read
  `connector-seed.ts` uses to insert one `connector_definitions` row per
  enabled provider into an organization that has none yet.
  `connector-seed-definitions.ts`'s `CONNECTOR_SEEDS` (GitHub, Slack,
  Notion, Linear, Vercel, Monday) are no longer read at seed time — they're
  quick-fill presets for the admin's "Add provider" form, filling every
  field except client id/secret. An admin isn't limited to these six: any
  slug, URLs, and actions can be configured from scratch.
- **`platform_secrets`**: a generic key/value table, same encryption, for
  single-value platform secrets not tied to a connector provider or model
  gateway. Holds `github_marketplace_webhook_secret` today.
  `isValidMarketplaceWebhookSignature` (`github-marketplace-webhook.ts`)
  is a pure, synchronous function that takes the secret as a parameter —
  the webhook route resolves it from `platform-secret-repository.ts` and
  passes it in, so signature verification has no database dependency and
  its tests need no mocking.
- **Admin UI**: `/admin/connector-providers`
  (`connector-provider-form.tsx`, `platform-secret-form.tsx`) lists every
  configured provider with its slug, display name, icon, enabled/disabled
  state, and full OAuth + actions config editable in a Dialog form, plus
  the webhook secret. Every mutation is superadmin-only
  (`requireSuperadmin`), matching `/admin/admins` and
  `/admin/model-gateways`. Disabling a provider only stops it being
  offered to organizations that haven't seeded it yet — it never reaches
  into an org's already-seeded `connector_definitions` row.

## Consequences

- An organization's own custom connectors, added from Settings with their
  own credentials, are unaffected by this — this governs only Pilot's own
  platform-managed connector providers.
- A fresh environment seeds zero connectors for a new organization until a
  platform admin adds and enables at least one provider from
  `/admin/connector-providers`.
- `.env.example` and `scripts/check-env.sh` list `CONNECTOR_TOKEN_ENCRYPTION_KEY`
  and `CONNECTOR_STATE_SIGNING_SECRET` under "Connectors"; providers and
  the webhook secret are configured from `/admin/connector-providers`.

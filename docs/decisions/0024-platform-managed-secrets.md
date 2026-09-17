# Platform-managed secrets

Status: implemented on 2026-09-18.

## Decision

A built-in connector's OAuth app credentials (GitHub, Slack, Notion,
Linear, Vercel, Monday) and the GitHub Marketplace webhook secret are
platform admin-managed from Settings → Admin → Connector providers,
backed by two database tables. Adding, rotating, or removing one needs no
deploy and no Vercel dashboard access.

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

- **`connector_provider_credentials`** (`src/db/schema/platform.ts`): one
  row per built-in connector slug (`github`, `slack`, ...) — `clientId`
  plain, `clientSecret` AES-256-GCM encrypted with
  `CONNECTOR_TOKEN_ENCRYPTION_KEY` (`token-encryption.ts`, the same key
  and module connector OAuth tokens themselves use — same trust tier).
  `connector-seed-definitions.ts`'s `ConnectorSeed` entries carry a
  `slug`; `connector-seed.ts` looks up each seed's credential from this
  table via `getConnectorProviderCredential`.
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
  `CONNECTOR_SEEDS` provider with its configured status and a client
  id/secret form, plus the webhook secret. Every mutation is
  superadmin-only (`requireSuperadmin`), matching `/admin/admins` and
  `/admin/model-gateways`.

## Consequences

- An organization's own custom connectors, added from Settings with their
  own credentials, are unaffected by this — this governs only Pilot's own
  built-in connectors' shared OAuth app credentials.
- A fresh environment seeds zero built-in connectors until a platform
  admin configures at least one provider from
  `/admin/connector-providers`.
- `.env.example` and `scripts/check-env.sh` list `CONNECTOR_TOKEN_ENCRYPTION_KEY`
  and `CONNECTOR_STATE_SIGNING_SECRET` under "Connectors"; per-provider
  credentials and the webhook secret are configured from
  `/admin/connector-providers`.

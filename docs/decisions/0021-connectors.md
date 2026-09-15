# Connectors

Status: implemented on 2026-09-15. Adds a new tool family — OAuth-authorized,
read-only connections to external providers — alongside the existing
`web-search`, `scratchpad`, `ask-user`, `plan`, and `code-sandbox` tools.

## Decision

Chat, Work, and Code agents can now use 8 read-only tools backed by real
OAuth connections to GitHub, Google Drive, Gmail, Slack, Notion, Linear,
Vercel, and Monday.com. A connection can be **personal** (a member connects
their own account) or **organization-wide** (an admin connects one shared
account visible to every member). Where both exist for the same provider,
the requesting member's personal connection wins — someone who has
connected their own GitHub account almost certainly wants their own
identity used, not the shared org one.

This is explicitly a **read-only** slice. No connector performs a
write/mutating call against any provider, even a low-risk one (no Slack
post, no Notion edit, no Linear issue creation). pilot-ai's own
`PILOT_CONVERSATION_PLAN.md` names three prerequisites for a connected
integration: "an Integration record, scoped credentials and an explicit
Worker permission." This slice delivers all three (the `connectorConnections`
table, encrypted tokens, and `enabledToolIds`/kind-allowlisting) but not the
fourth thing that plan says write tools additionally need — a durable
approval workflow. Write actions stay blocked until that exists.

## Mechanism

- **Decrypted secrets never leave Pilot's server process.** pilot-ai's
  connector tools are context-bound factories — the same pattern as
  `scratchpad`/`plan` — that POST `{organizationId, executionId, toolId,
action, params}` to one new endpoint, `POST /api/runtime/connectors/execute`
  (`src/app/api/runtime/connectors/execute/route.ts`), authenticated the same
  way as every other `/api/runtime/*` callback (WorkOS M2M token verified
  before the body is read, ownership derived from the `executionId` via the
  execution/conversation join, never trusted from the payload). Pilot alone
  holds `CONNECTOR_TOKEN_ENCRYPTION_KEY`, decrypts the access token, calls
  the real provider API, and returns a bounded, pre-shaped result. pilot-ai
  never sees a raw token.
- **Data model**: `connectorConnections`
  (`src/db/schema/connectors.ts`) — `organizationId`, `ownerScope`
  (`"organization" | "user"`), `ownerWorkosUserId` (set only for `"user"`),
  `providerId`, encrypted access/refresh tokens (separate IV and auth tag per
  field), `grantedScopes`, `status`, and `isDefault`. Two partial unique
  indexes enforce at most one active default per `(organization, provider)`
  among org-scoped rows, and per `(organization, user, provider)` among
  personal rows — the mechanism behind "exactly one default connection per
  provider per owner-scope." A user (or org) can hold more than one
  connection per provider (multiple accounts); only the default is ever used
  by a tool call. Selecting among several non-default personal connections
  inside a single tool call is out of scope for this slice — a documented
  extension point, not a limitation nobody noticed.
- **Encryption**: AES-256-GCM (`src/connectors/token-encryption.ts`), a
  32-byte key from `CONNECTOR_TOKEN_ENCRYPTION_KEY` (base64), a fresh random
  IV per encryption, never derived or reused. App-level encryption rather
  than a managed KMS/Vault — deliberately no new infra dependency at this
  stage; revisit if a real key-rotation or multi-region requirement appears.
- **OAuth flow**: `GET /api/connectors/[providerId]/authorize` (session
  required, builds and redirects to the provider's authorize URL with a
  signed `state`) and `GET /api/connectors/[providerId]/callback` (verifies
  `state`, exchanges the code, encrypts and stores the tokens, redirects back
  to Settings). `state` is HMAC-signed (`src/connectors/oauth-state.ts`,
  `CONNECTOR_STATE_SIGNING_SECRET` — a separate key from the token-encryption
  one, so rotating either doesn't force rotating the other), 10-minute
  expiry, and re-checked against the callback's own session (a state token
  replayed under a different session is rejected the same as an
  expired one). No server-side nonce/replay table: the provider's own
  authorization code is already single-use, so a replayed callback URL fails
  cleanly at the token exchange — adding nonce storage on top would be
  complexity this slice doesn't need. Both routes are matched in
  `src/proxy.ts` (`/api/connectors/:path*`), unlike `/api/runtime/*`, which
  is M2M-authenticated instead of session-authenticated.
- **Google is one provider, two tools**: Gmail and Google Drive share a
  single Google OAuth connection (`gmail.readonly` + `drive.readonly`
  requested together at connect time) rather than requiring two separate
  connections — this reflects how a Google account actually works and avoids
  asking a member to connect "Google" twice.
- **Gating**: `src/conversations/tool-authorization.ts`'s `allowedToolIds`
  gained one more branch — a connector tool is granted only when
  `getAvailableConnectorProviders` (`src/connectors/connector-repository.ts`)
  finds at least one active connection (personal or organization) for its
  provider. There is no separate `xConnectorEnabled` boolean preference: the
  connection's existence **is** the enablement signal, unlike `web-search`/
  `code-sandbox`, which are still org preference booleans because those
  tools have no comparable "connected or not" state of their own.
  `PILOT_ENABLE_CONNECTORS` is pilot-ai's platform-level circuit breaker for
  all 8 tools together (`runtime-selection.ts`), independent of any org's or
  user's connection state — the same role `PILOT_ENABLE_WEB_SEARCH`/
  `PILOT_ENABLE_CODE_SANDBOX` already play.
- **Settings UI**: `src/components/settings/connectors-section.tsx` lists all
  7 providers (Google shown once, covering both tools); each row shows
  connect/connected state, account identifier, a default badge, and
  disconnect/make-default actions. Personal connections are visible only to
  the member who made them; organization connections are visible to everyone
  but editable only by admins — `disconnectConnectorConnection`/
  `setDefaultConnectorConnection` re-check ownership and admin status inside
  the repository itself (`src/connectors/connector-connection-mutations.ts`),
  never trusting that a rendered list implies the poster owns the
  `connectionId` in the form.
- **Activity transparency**: each of the 8 tools has its own formatter in
  pilot-ai's `tool-detail.ts` (ADR-0018), built only from the tool's typed,
  already-non-secret output fields (titles, urls, snippets) — never an
  account identifier or anything token-shaped.

## Consequences

- Multi-account selection within a single tool call (e.g. "search my _work_
  GitHub, not my personal one, for this specific call") is not supported —
  only the default connection per provider is ever used. A future slice
  could add an optional `account` parameter to each tool's input schema.
- `db.transaction` is not available on this app's `neon-http` driver;
  `setDefaultConnectorConnection`'s two-statement default swap uses
  `db.batch` instead (the same atomicity mechanism `agent-repository.ts`
  already relies on for its own multi-row writes) — a real bug caught by
  this slice's own integration test before it ever reached production.
- No write/mutating connector action exists yet, and none should be added
  until a durable approval workflow exists for it — extending an existing
  read-only tool with a write action is exactly the kind of change AGENTS.md
  asks to have "equivalent authorization, activity, and storage behavior"
  before it ships.

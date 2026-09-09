# Pilot implementation status

Updated 2026-09-09. This is an implementation record, not a completion claim.

## Verified project-memory boundary

Projects remain private, creator-scoped collections. Pilot now resolves a
conversation's single project association on the server and passes its typed
project context over the authenticated Pilot-to-runtime channel. Project
instructions are available to the agent. Shared project memory is disabled by
default; when its owner enables it, Pilot AI uses a project-scoped Mastra
resource and resource-scoped Observational Memory, while each conversation
keeps its separate thread. The existing allowlisted Kilo Gateway model runs
the observer. Files, knowledge, shared projects, and cross-user context are
still unavailable.
Moving or removing a conversation first clears the former shared-memory
resource before the database association can change. A cleanup failure leaves
the chat in its existing project, preventing resource-scoped summaries from
remaining available to a former project's chats.
The conversation header also offers the current user's private projects, so a
chat can be moved or removed without leaving its conversation. The picker does
not introduce project sharing, files, or knowledge retrieval.

## Goal

Ship an open-source, self-hostable AI workforce platform with persistent organizational agents. Pilot owns the domain; Mastra provides runtime capabilities behind typed boundaries. First prove one agent end-to-end, including durable execution, protected actions, approval, suspend/resume, results and history. Do not expand into multiple agent architectures or secondary features before that works.

## Current slice: production chat workspace interface

Pilot's authenticated workspace now has a production-focused, responsive chat
shell built with the existing shadcn sidebar and AI Elements conversation and
message components. The text-only mark is `Pilot.` when expanded and `P` when
collapsed; the former decorative `logo.png` is removed, leaving image branding
to the favicon. The home surface presents a conversational-first composer and
an organization-scoped chooser for configured Conversational personas. A
missing persona is created as `Pilot` only when an active member sends a
non-empty first message. Research is available when its matching production
feature flags are enabled. It has one tenant-scoped, read-only capability:
the hardened `web-search` adapter.

This is an interface and routing improvement over the durable-execution
foundation below. It does not add message streaming, attachments, runtime tool
events, browser/scratchpad panes, reasoning content, or tool approvals.
Research tool lifecycle is the sole production tool activity the UI can
truthfully render today. See
[chat workspace interface](decisions/0008-chat-workspace-interface.md).
Tool approval is fail-closed: until a durable approval workflow exists, only
an explicit `allow` rule can pass `web-search` to the Research runtime.

Each submitted first message receives a deterministic local title, avoiding an
extra model call or content disclosure. The expanded sidebar lists the newest
organization-scoped chats, so users can return directly to recent work; the
collapsed sidebar retains the compact navigation mark.

When an authenticated runtime request fails after Pilot has accepted a message,
Pilot routes the user to the saved conversation and renders its failed execution
activity. This preserves the user's work and gives them a direct retry path.

Conversation deletion uses a destructive confirmation and retains the Neon
record if protected runtime-memory cleanup fails. The dialog reports that
recoverable failure rather than silently implying the chat was deleted.
Persona deletion follows the same rule for every owned conversation: Pilot
removes runtime memory before deleting the organization-scoped persona and
shows an error when that cleanup cannot be completed.

Follow-up messages inside an existing conversation now stream over a
WorkOS-authorized Pilot route. The AuthKit proxy explicitly covers the
conversation-stream API path so `withAuth()` receives only the trusted session
headers supplied by WorkOS; anonymous and forged-session POST requests are
redirected before the route parses a body or touches persistence. The browser
receives plain text only; Pilot persists the verified user prompt before
streaming and persists the returned Worker response, usage, run ID, and
completed execution after the stream closes.
Stopping a response records a failed execution and preserves the user prompt.
New and existing chats use the same protected streaming lifecycle.
During an active protected stream, the chat renders a collapsed transient
activity for the verified browser state; it never labels that status as
reasoning or tool use, and persisted execution activity replaces it when the
stream ends.
The generated `0008_complex_justin_hammer` migration extends the append-only
activity record with sanitized tool lifecycle events. A stored tool event is
limited to a fixed capability ID, optional tool-call correlation ID, and
server-generated status; it cannot retain tool inputs, outputs, URLs, errors,
credentials, or reasoning. The chat activity component can render those events
when a protected runtime adapter later emits them. This is the event foundation
for Research, not an enablement of Research tools or approvals.

The next local slice wires a production Research request to the same protected
OpenAI-compatible runtime path. A selected Research persona receives only
`web-search` when it explicitly has that preference; all broader Research
development tools remain absent. Tool lifecycle records travel through a
separate OIDC-authenticated callback, keeping the completion stream standard.
This requires matching Pilot and Pilot AI feature flags plus a fixed callback
URL before it can be enabled or deployed.
The server test verifies that Pilot accepts text only when a terminal runtime
usage event follows, rejecting partial streams before a Worker response can be
persisted.

The product language is now **agents** and **agent fleet**. Existing `workers`
routes, tables, and runtime identifiers remain internal compatibility details
until a deliberate, tested domain migration can preserve organization isolation
and existing conversation history. The first ChatGPT-style interface slice uses
Vercel's AI Elements registry for its conversation canvas, markdown-safe agent
responses, scroll behavior, and docked composer. It does not imply that live
streaming, attachments, tool invocation, tool traces, reasoning display,
approvals, or persona templates are complete: those require an explicit
runtime event contract, persisted execution/activity records, and capability
authorization before the UI exposes them.

Each non-empty submitted message now creates a Pilot-owned, organization-scoped
execution immediately before the protected runtime call. The returned response
completes that execution; runtime and response-persistence failures append a
failed lifecycle event. The generated `0004_condemned_speed_demon` migration
adds `executions` and append-only `activity_events` with organization-scoped
foreign keys and read indexes. The Dashboard derives its running-task metric
from those durable records. Completed response activity is rendered collapsed
below the matching answer, and the composer reports an in-flight response.
This is a lifecycle foundation, not yet live streaming: it does not render
tool traces, reasoning, approvals, or browser/scratchpad panes.

The accepted [agent-fleet experience](decisions/0005-agent-fleet-experience.md)
opens on Conversational chat and defines persona configuration, sidebar
navigation, live activity, Research's future capability boundary, attachment
scope, approval modes, and dashboard priorities. The persona configuration
slice is complete; the `workers` persistence name remains an internal
compatibility detail. It now
stores the persona's base agent, optional goals, tone and output format, plus
explicit tool preferences, approval rules, and future knowledge-source IDs.
The creation form persists those fields and the agent detail page renders them.
Tool preferences are not capabilities: a malicious form submission cannot make
a tool available because no production tool adapter is exposed in Pilot.

The authenticated workspace now uses shadcn's maintained responsive sidebar
primitive. It provides the required collapsed `P` mark, expanded `Pilot.` mark,
and the first navigation structure for New chat, Chats, Agent fleet, Personas,
Dashboard, and Settings. The links currently preserve the existing workspace
route while their own persisted read models are introduced; this shell is not a
claim that those destinations are implemented yet.

Implemented: WorkOS AuthKit sign-in route, callback, session proxy, POST sign-out action, organization membership listing and membership-checked organization switching. The page uses Pilot colors, JetBrains Mono and official shadcn source. No local password system or alternative auth provider is installed.

Persistent worker creation and read-only configuration viewing are implemented for an active selected organization. A Worker is Pilot data, rather than a runtime Agent: it has an organization-scoped unique name, instructions, model ID, creator and timestamps. The action rechecks the WorkOS membership for the signed-in user and selected organization before creating or updating the corresponding Pilot organization/member records and inserting the worker. The detail route independently rechecks that membership and scopes the lookup by organization. Authorized members can create, list, and inspect organization-scoped worker conversation sessions.

The [Pilot runtime contract](decisions/0004-mastra-conversation-runtime-contract.md) preserves this boundary. The Pilot application now has organization-scoped `conversation_messages`, a server-only, typed client for the protected Pilot runtime, and an authenticated WorkOS server action which reloads the Worker and Conversation before every request. It persists the verified user message and the returned Worker reply, including model, runtime-run identifier, latency and token counts. Kilo Gateway model `kilo/kilo-auto/free` is allowlisted for development. The UI leaves message submission unavailable until `PILOT_AI_RUNTIME_URL` is set. Pilot forwards its short-lived Vercel OIDC token after the WorkOS and tenant checks. It sends Vercel's Trusted Sources header for deployment protection and a separate application header because deployment protection can consume its own header; the runtime validates the application token's Vercel signature, fixed issuer, exact Pilot project and environment claims before accepting any request. This is intentionally not an end-to-end claim: an authenticated two-turn browser verification still needs to prove the complete production path.

The generated `0000_initial_worker_domain` through `0005_demonic_spiral` migrations create `organizations`, `members`, `workers`, `conversations`, `conversation_messages`, `executions`, and `activity_events` with organization-scoped foreign keys and indexes. `0003` adds persisted persona configuration. `0004` adds durable execution/activity records. `0005` links a completed activity to its persisted Worker response. `0004` and `0005` are applied to development and production. Preview remains intentionally pending until its own authenticated WorkOS configuration is provisioned. The application uses Drizzle `0.45.2` with Neon's HTTP driver `1.1.0`; migrations use `DATABASE_URL`. See [worker persistence decision](decisions/0002-worker-persistence.md) and [execution activity decision](decisions/0006-execution-activity-records.md).

Quality tooling: ESLint, TypeScript, Prettier, Knip, Playwright, a live Neon integration test, pnpm audit, and a GitHub Actions quality workflow. Browser tests found anonymous workspace access returned 500 because AuthKit's page-level sign-in helper writes PKCE cookies during rendering. Proxy enforcement and a read-only page fallback fixed that path. On 2026-09-06, a fresh `pnpm check`, production `pnpm build`, `pnpm test`, `pnpm test:db` and `pnpm audit --audit-level high` all passed after the server-action-module authentication fix. The four Playwright tests cover the mobile public page, PKCE redirect, anonymous/forged-session rejection of workspace and nested worker conversation routes, and callback rejection without state. The Neon test creates and removes randomized fixtures while verifying worker and conversation persistence plus organization isolation. CI repeats all non-database checks with test-only settings; it never connects to a Neon project.

On 2026-09-06, the official WorkOS CLI emulator verified Pilot's full local AuthKit browser path: PKCE sign-in, callback, authenticated workspace rendering, POST sign-out, and a protected workspace redirect after the cookie was cleared. The emulator's logout endpoint deliberately renders a blank completion response instead of following a post-logout redirect, so the verification explicitly revisited `/workspace` to prove the Pilot session was removed. `WORKOS_MODE=agent workos verify-login --json` also created and removed a throwaway user in the local environment after confirming the password grant and access/refresh tokens. The production origin returned the public landing page and its sign-in route issued a PKCE redirect to the configured production WorkOS client and callback URI.

Not verified: successful browser sign-in against the hosted WorkOS local or production environment, organization switching, worker creation with an active hosted membership, and revoked-membership rejection. Playwright's committed test credentials exercise anonymous boundaries only; the emulator verification uses a temporary local user and is not a substitute for a hosted membership test. Completing a hosted browser flow would issue an authentication email to the account owner, which remains a user-visible action to authorize.

## Provisioned resources

- Vercel project: `sdk-enterprises/pilot`, ID `prj_RZRmVOvddx1yCNe6j25Cj4w3ugZn`. Node 24 and the `nextjs` framework preset are configured. The GitHub connection to `SDK-E/pilot` is verified, with `main` as the production branch and automatic deployment creation enabled. The production deployment for commit `1f9efcb` is Ready; the earlier `7eb4588` deployment also completed successfully after allowing the required `esbuild` install scripts.
- Vercel project: `sdk-enterprises/pilot-ai`, ID `prj_glOhpsCd37RwbvGhMWIerVAIHSXA`, serves the runtime at `https://ai.pilot.sdk.enterprises`. Its remote Linux build emits an OpenAI-compatible `POST /v1/chat/completions` function. The function validates a team-issued Vercel OIDC token against the exact `pilot` project and matching environment before it parses input, so the custom domain is protected even though Vercel Deployment Protection excludes custom domains. Production Research is feature-gated in both projects and imports only hardened LangSearch-backed `web-search`; its OIDC-authenticated callback persists sanitized lifecycle summaries only. Kilo Gateway credentials, `TURSO_DATABASE_URL`, and `TURSO_AUTH_TOKEN` are sensitive Preview and Production variables. Pilot is configured as the Trusted Source, and Production `PILOT_AI_RUNTIME_URL` points to the runtime; an authenticated production browser conversation still needs end-to-end verification.
- Production origin: `https://pilot.sdk.enterprises`. Its Cloudflare DNS zone has an unproxied automatic-TTL A record to Vercel's required `76.76.21.21`; Vercel verified the project domain. The parent domain remains on its existing Cloudflare nameservers.
- WorkOS production environment: `environment_01KX6CY4Y7671HC2VRQ5ADYGBA`. SDK Pilot application `app_01M1R77E90YV8T78ZPY7WC8JSM`, client `client_01M1R77E8ZZ7689T03CF1SANDY`. Its application API key and cookie password are sensitive Vercel production variables. Callback `/auth/callback`, initiate-login `/sign-in`, homepage and sign-out at the production origin were saved and read back.
- WorkOS local environment: `environment_01M1QD1AE9B8TKKBT4VWH8N60T`. SDK Pilot application `app_01M1S3YKJ0TBQYPA2J3T9GSDTC`, client `client_01M1S3YKJ02RNG615NFDW51FHH`. It has an application-scoped local API key stored only in local/Vercel development configuration. Callback URIs allow `http://localhost:3000/auth/callback` and the current machine's `http://localhost:3001/auth/callback`; homepage and sign-out are `http://localhost:3000`; initiate login is `http://localhost:3000/sign-in`.
- Preview has no WorkOS credentials until a dedicated preview application and callback URLs are provisioned. On 2026-09-06, its inherited production API key, cookie password, and local client ID were removed from Vercel; preview retains only its isolated Neon variables.
- Neon production: `empty-fog-95658984` (`sdk-pilot`).
- Neon development: `wandering-shadow-84624750` (`sdk-pilot-local`).
- Neon preview: `proud-wildflower-67913684` (`sdk-pilot-preview`).

Neon projects belong to SDK Enterprises, use PostgreSQL 18 in `aws-eu-central-1`, database `pilot`, and 0.25 CU computes. Separate projects isolate credentials and data. `DATABASE_URL` is stored in the matching Vercel environments; production/preview values are sensitive. Development also has the local WorkOS API key, client ID, cookie password and the standard `localhost:3000` public redirect URI. This machine overrides only that URI in ignored `.env.development.local` because port 3000 belongs to another project. The initial worker-domain schema is migrated and verified in all three projects.

## Next acceptance steps

1. Configure a preview WorkOS application with isolated preview credentials and allowed preview URLs.
2. Verify the authenticated flow against the hosted local WorkOS environment, including an active membership, membership rejection and logout.
3. Verify the authenticated creation form with a real active membership, including a rejected/revoked membership.
4. Establish the shared design-system distribution from `pilot-ui`; current generated components are in the app and must not become competing shared sources.
5. Set `PILOT_AI_RUNTIME_URL` for Preview after it has its own stable runtime URL, then prove one real authenticated two-turn conversation in each environment, including a fresh runtime process reading the first message.
6. Render the persisted execution activity in the chat interface and prove a real authorized end-to-end runtime run across requests/restarts before building protected actions, approval, suspension/resume and the rest of the one-worker milestone.

The next vertical slice is a Pilot-owned task and approval record paired with a
Turso-backed Mastra workflow suspension. Its boundary is recorded in
[task approval workflow boundary](decisions/0007-task-approval-workflow-boundary.md).

`pilot-ai` uses `src/index.ts` as its Mastra development entrypoint, with agent-specific modules in `src/conversation` and `src/research`, and shared runtime code in `src/runtime`. The deployed runtime selects a request-scoped Research adapter only for an explicitly enabled Research persona, and only with `web-search`; broader development tools remain absent. Pilot owns organization-scoped task and approval records plus their read-only workspace routes; starting, deciding, resuming, and rendering a durable approval workflow are still pending. `pilot-integrations` and `pilot-ui` remain package stubs. There are no user-facing file, browser, scratchpad, MCP, or integration controls.

# Current slice: live safe activity

Research availability is enforced by the shared synchronous and streaming
message paths before a user message or execution is created. An existing
Research conversation cannot bypass a disabled `PILOT_RESEARCH_ENABLED` flag.

During a streamed reply, the conversation UI polls a WorkOS-protected activity
endpoint and shows sanitized execution and tool lifecycle summaries in a
collapsed disclosure. The endpoint is organization-scoped and does not expose
tool payloads, outputs, URLs, errors, or reasoning. It is best effort: text
streaming remains the authoritative reply channel.

New chat also uses this live feed after the server creates a conversation. An
organization without a configured persona sees a direct, non-submittable path
to Persona creation instead of an invalid runtime request.

# Current slice: private chat ownership

Chats are now filtered by their existing `created_by_workos_user_id` field.
History, recent chat links, direct chat pages, message reads and inserts,
streaming, deletion, and activity polling all require the creator's
authenticated WorkOS user ID.
Ownerless historical records remain in the database but are intentionally
inaccessible until an explicit recovery or sharing workflow exists.

Chat History also supports creator-scoped title changes. The rename action is
separate from deletion and does not alter the chat’s messages or runtime memory.

# Current slice: conversation details and tasks

The `0009_sudden_siren` migration adds an optional conversation foreign key to
Pilot-owned tasks. The open-chat rail is now the single surface for its safe
activity timeline, tasks, and approvals. The timeline expands only server
generated execution summaries; it never receives tool arguments, outputs,
URLs, errors, secrets, or model reasoning. A member can add a manual task from
that rail after the Server Action and repository independently confirm the
active WorkOS membership and the caller's creator-scoped chat, agent, and
organization. The integration test proves that another member cannot read or
create a task on that chat. The migration has not yet been deployed to
production, so this slice remains local until its full quality gate and a
user-requested deployment are complete.

# Current slice: composer preference

The `0010_funny_hiroim` migration adds a per-user `user_preferences` record.
Settings now persists whether Enter sends a message or adds a line. The default
is Ctrl/⌘ + Enter to send, with Enter reserved for a new line. Both the new and
existing chat composers use the stored preference, preserve Shift + Enter for
new lines in Enter-send mode, and do not submit during IME composition. The
preference repository and keyboard behavior have direct integration and unit
test coverage. This migration is applied to development only until a
user-requested production deployment runs the Vercel production migration.

# Current slice: projects

The `0011_fancy_mephistopheles` migration adds creator-scoped projects and
their conversation associations. An authenticated active member can create a
project, edit its name and stored instructions, and add or remove only chats
that they created in the active WorkOS organization. The destructive project
confirmation removes only the project and associations, never its chats.
Project repositories independently
apply the organization and creator filters, including when an association is
created, and the live Neon integration test covers cross-member denial. The
sidebar Projects link now leads to this real surface.

This slice deliberately does not claim shared chat memory, project files,
knowledge retrieval, or agent instruction injection. Those require a new
server-verified Pilot-to-runtime command, a resource model, and a storage
contract. Mastra observational memory would also perform background observer
model calls, so it remains unavailable until a model is explicitly authorized.
See the [project boundary](decisions/0009-project-boundary.md).

# Current slice: navigation and account menu

The `0012_lush_titanium_man` migration adds organization preferences for the
default agent. Settings stores a selected organization-owned agent, and New
chat opens with that agent selected without preventing a user from selecting
another one. The preference is cleared safely if the agent is removed. The
repository and live Neon integration test reject a default agent from another
organization.

The responsive workspace sidebar now centers New chat and private Chat history.
It loads up to 50 of the signed-in creator’s recent chats and lets shadcn’s
sidebar scroll them independently of the fixed footer. The footer provides
Dashboard, the persisted Projects route, and a shadcn account dropdown. That
menu uses the WorkOS API’s
active memberships (including organization display names), rechecks membership
inside the existing organization-switch Server Action, exposes the read-only
profile and Settings, and signs out through the existing POST action. Settings
now contains the Agent fleet and Persona management links. Project sharing,
attachments, and shared context are not implemented.

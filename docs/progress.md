# Pilot implementation status

Updated 2026-09-05. This is an implementation record, not a completion claim.

## Goal

Ship an open-source, self-hostable AI workforce platform with persistent organizational workers. Pilot owns the domain; Mastra provides runtime capabilities behind typed boundaries. First prove one worker end-to-end, including durable execution, protected actions, approval, suspend/resume, results and history. Do not expand into multiple worker architectures or secondary features before that works.

## Current slice: authenticated organization access and persistent worker setup

Implemented: WorkOS AuthKit sign-in route, callback, session proxy, POST sign-out action, organization membership listing and membership-checked organization switching. The page uses Pilot colors, JetBrains Mono and official shadcn source. No local password system or alternative auth provider is installed.

Persistent worker creation and read-only configuration viewing are implemented for an active selected organization. A Worker is Pilot data, rather than a Mastra Agent: it has an organization-scoped unique name, instructions, model ID, creator and timestamps. The action rechecks the WorkOS membership for the signed-in user and selected organization before creating or updating the corresponding Pilot organization/member records and inserting the worker. The detail route independently rechecks that membership and scopes the lookup by organization. This is a configuration slice only; it does not call a model, create a conversation, or execute work.

The generated `0000_initial_worker_domain` migration is applied and schema-verified in the development, preview, and production Neon projects. It creates `organizations`, `members`, and `workers` with foreign keys, a unique worker name per organization, and a worker list index. The application uses Drizzle `0.45.2` with Neon's HTTP driver `1.1.0`; migrations prefer the direct `DATABASE_URL_UNPOOLED`. See [worker persistence decision](decisions/0002-worker-persistence.md).

Quality tooling: ESLint, TypeScript, Prettier, Knip, Playwright, a live Neon integration test and pnpm audit. Browser tests found anonymous workspace access returned 500 because AuthKit's page-level sign-in helper writes PKCE cookies during rendering. Proxy enforcement and a read-only page fallback fixed that path. On 2026-09-05, a fresh `pnpm check`, production `pnpm build`, `pnpm test`, `pnpm test:db` and `pnpm audit --audit-level high` all passed. The four Playwright tests cover the mobile public page, PKCE redirect, anonymous/forged-session rejection, and callback rejection without state. The Neon test creates and removes randomized fixtures while verifying worker persistence and organization isolation.

Not verified: successful hosted WorkOS sign-in through callback, organization switching, sign-out, revoked memberships, and production deployment. Test credentials in Playwright exercise anonymous boundaries only; they are not a mock authenticated session or evidence of successful login. The hosted local sign-in page was reached with the application client and callback URI; completing it would issue an authentication email to the account owner, which remains a user-visible action to authorize.

## Provisioned resources

- Vercel project: `sdk-enterprises/pilot`, ID `prj_RZRmVOvddx1yCNe6j25Cj4w3ugZn`. Node 24 and the `nextjs` framework preset are configured. The GitHub connection to `SDK-E/pilot` is verified, with `main` as the production branch and automatic deployment creation enabled. No deployment exists yet.
- Production origin: `https://pilot.sdk.enterprises`. Its Cloudflare DNS zone has an unproxied automatic-TTL A record to Vercel's required `76.76.21.21`; Vercel verified the project domain. The parent domain remains on its existing Cloudflare nameservers.
- WorkOS production environment: `environment_01KX6CY4Y7671HC2VRQ5ADYGBA`. SDK Pilot application `app_01M1R77E90YV8T78ZPY7WC8JSM`, client `client_01M1R77E8ZZ7689T03CF1SANDY`. Callback `/auth/callback`, initiate-login `/sign-in`, homepage and sign-out at the production origin were saved and read back.
- WorkOS local environment: `environment_01M1QD1AE9B8TKKBT4VWH8N60T`. SDK Pilot application `app_01M1S3YKJ0TBQYPA2J3T9GSDTC`, client `client_01M1S3YKJ02RNG615NFDW51FHH`. It has an application-scoped local API key stored only in local/Vercel development configuration. Callback URIs allow `http://localhost:3000/auth/callback` and the current machine's `http://localhost:3001/auth/callback`; homepage and sign-out are `http://localhost:3000`; initiate login is `http://localhost:3000/sign-in`.
- Neon production: `empty-fog-95658984` (`sdk-pilot`).
- Neon development: `wandering-shadow-84624750` (`sdk-pilot-local`).
- Neon preview: `proud-wildflower-67913684` (`sdk-pilot-preview`).

Neon projects belong to SDK Enterprises, use PostgreSQL 18 in `aws-eu-central-1`, database `pilot`, and 0.25 CU computes. Separate projects isolate credentials and data. Pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` were stored in the matching Vercel environments; production/preview values are sensitive. Development also has the local WorkOS API key, client ID, cookie password and the standard `localhost:3000` public redirect URI. This machine overrides only that URI in ignored `.env.development.local` because port 3000 belongs to another project. The initial worker-domain schema is migrated and verified in all three projects.

## Next acceptance steps

1. Create the production WorkOS application API key, store it as a sensitive production Vercel secret, and configure a preview WorkOS application with isolated preview credentials and allowed preview URLs.
2. Verify the authenticated flow against the real local environment, including membership rejection and logout.
3. Deploy the tested source and verify the production origin.
4. Verify the authenticated creation form with a real active membership, including a rejected/revoked membership and sign-out.
5. Establish the shared design-system distribution from `pilot-ui`; current generated components are in the app and must not become competing shared sources.
6. Add a persistent conversation and memory boundary for a selected worker.
7. Prove Mastra durable execution across requests/restarts before building protected actions, approval, suspension/resume and the rest of the one-worker milestone.

`pilot-ai` is initialized with Mastra but has no registered agent, model, tool, local storage, or runtime connection to Pilot. `pilot-integrations` and `pilot-ui` remain package stubs. There are no conversations, tasks, runtime, approvals, memory or integration capabilities yet.

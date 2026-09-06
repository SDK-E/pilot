# Pilot implementation status

Updated 2026-09-06. This is an implementation record, not a completion claim.

## Goal

Ship an open-source, self-hostable AI workforce platform with persistent organizational workers. Pilot owns the domain; Mastra provides runtime capabilities behind typed boundaries. First prove one worker end-to-end, including durable execution, protected actions, approval, suspend/resume, results and history. Do not expand into multiple worker architectures or secondary features before that works.

## Current slice: authenticated organization access and persistent worker setup

Implemented: WorkOS AuthKit sign-in route, callback, session proxy, POST sign-out action, organization membership listing and membership-checked organization switching. The page uses Pilot colors, JetBrains Mono and official shadcn source. No local password system or alternative auth provider is installed.

Persistent worker creation and read-only configuration viewing are implemented for an active selected organization. A Worker is Pilot data, rather than a Mastra Agent: it has an organization-scoped unique name, instructions, model ID, creator and timestamps. The action rechecks the WorkOS membership for the signed-in user and selected organization before creating or updating the corresponding Pilot organization/member records and inserting the worker. The detail route independently rechecks that membership and scopes the lookup by organization. Pilot also persists organization-scoped conversations attached to a verified worker; the conversation UUID is reserved as the future Mastra thread ID. No model, messages, or memory are enabled yet.

The generated `0000_initial_worker_domain` and `0001_wild_marauders` migrations are applied in the development, preview, and production Neon projects. They create `organizations`, `members`, `workers`, and `conversations` with organization-scoped foreign keys and indexes. The application uses Drizzle `0.45.2` with Neon's HTTP driver `1.1.0`; migrations prefer the direct `DATABASE_URL_UNPOOLED`. See [worker persistence decision](decisions/0002-worker-persistence.md).

Quality tooling: ESLint, TypeScript, Prettier, Knip, Playwright, a live Neon integration test, pnpm audit, and a GitHub Actions quality workflow. Browser tests found anonymous workspace access returned 500 because AuthKit's page-level sign-in helper writes PKCE cookies during rendering. Proxy enforcement and a read-only page fallback fixed that path. On 2026-09-05, a fresh `pnpm check`, production `pnpm build`, `pnpm test`, `pnpm test:db` and `pnpm audit --audit-level high` all passed. The four Playwright tests cover the mobile public page, PKCE redirect, anonymous/forged-session rejection of workspace and nested worker routes, and callback rejection without state. The Neon test creates and removes randomized fixtures while verifying worker persistence and organization isolation. CI repeats all non-database checks with test-only settings; it never connects to a Neon project.

Not verified: successful hosted WorkOS sign-in through callback, organization switching, sign-out, and revoked memberships. Test credentials in Playwright exercise anonymous boundaries only; they are not a mock authenticated session or evidence of successful login. On 2026-09-06 the production origin returned the public landing page and its sign-in route issued a PKCE redirect to the configured production WorkOS client and callback URI. Completing the authentication flow would issue an authentication email to the account owner, which remains a user-visible action to authorize.

## Provisioned resources

- Vercel project: `sdk-enterprises/pilot`, ID `prj_RZRmVOvddx1yCNe6j25Cj4w3ugZn`. Node 24 and the `nextjs` framework preset are configured. The GitHub connection to `SDK-E/pilot` is verified, with `main` as the production branch and automatic deployment creation enabled. The production deployment for commit `f9c3ff3` is Ready and assigned to the production origin; the earlier `7eb4588` deployment also completed successfully after allowing the required `esbuild` install scripts.
- Production origin: `https://pilot.sdk.enterprises`. Its Cloudflare DNS zone has an unproxied automatic-TTL A record to Vercel's required `76.76.21.21`; Vercel verified the project domain. The parent domain remains on its existing Cloudflare nameservers.
- WorkOS production environment: `environment_01KX6CY4Y7671HC2VRQ5ADYGBA`. SDK Pilot application `app_01M1R77E90YV8T78ZPY7WC8JSM`, client `client_01M1R77E8ZZ7689T03CF1SANDY`. Its application API key and cookie password are sensitive Vercel production variables. Callback `/auth/callback`, initiate-login `/sign-in`, homepage and sign-out at the production origin were saved and read back.
- WorkOS local environment: `environment_01M1QD1AE9B8TKKBT4VWH8N60T`. SDK Pilot application `app_01M1S3YKJ0TBQYPA2J3T9GSDTC`, client `client_01M1S3YKJ02RNG615NFDW51FHH`. It has an application-scoped local API key stored only in local/Vercel development configuration. Callback URIs allow `http://localhost:3000/auth/callback` and the current machine's `http://localhost:3001/auth/callback`; homepage and sign-out are `http://localhost:3000`; initiate login is `http://localhost:3000/sign-in`.
- Preview has no WorkOS credentials until a dedicated preview application and callback URLs are provisioned. On 2026-09-06, its inherited production API key, cookie password, and local client ID were removed from Vercel; preview retains only its isolated Neon variables.
- Neon production: `empty-fog-95658984` (`sdk-pilot`).
- Neon development: `wandering-shadow-84624750` (`sdk-pilot-local`).
- Neon preview: `proud-wildflower-67913684` (`sdk-pilot-preview`).

Neon projects belong to SDK Enterprises, use PostgreSQL 18 in `aws-eu-central-1`, database `pilot`, and 0.25 CU computes. Separate projects isolate credentials and data. Pooled `DATABASE_URL` and direct `DATABASE_URL_UNPOOLED` are stored in the matching Vercel environments; production/preview values are sensitive. Development also has the local WorkOS API key, client ID, cookie password and the standard `localhost:3000` public redirect URI. This machine overrides only that URI in ignored `.env.development.local` because port 3000 belongs to another project. The initial worker-domain schema is migrated and verified in all three projects.

## Next acceptance steps

1. Configure a preview WorkOS application with isolated preview credentials and allowed preview URLs.
2. Verify the authenticated flow against the real local environment, including membership rejection and logout.
3. Verify the authenticated creation form with a real active membership, including a rejected/revoked membership and sign-out.
4. Establish the shared design-system distribution from `pilot-ui`; current generated components are in the app and must not become competing shared sources.
5. Add a persistent conversation and memory boundary for a selected worker.
6. Prove Mastra durable execution across requests/restarts before building protected actions, approval, suspension/resume and the rest of the one-worker milestone.

`pilot-ai` is under parallel initialization and has no approved runtime contract or connection to Pilot. It must not be deployed or called until Pilot can provide tenant-scoped authorization, a model gateway, and Neon-backed durable storage. `pilot-integrations` and `pilot-ui` remain package stubs. Pilot persists conversation records but has no user-facing messages, tasks, runtime, approvals, memory or integration capabilities yet.

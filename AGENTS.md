<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Pilot

Read `docs/progress.md`, `docs/decisions/0001-platform-boundaries.md`, and `docs/decisions/0004-mastra-conversation-runtime-contract.md` before continuing. Keep them synchronized with verified implementation and environment changes.

- WorkOS is the required auth provider. Use application-specific credentials. Authenticate and authorize every server mutation; never trust a submitted organization ID or model decision as authorization. When a Route Handler calls `withAuth()`, its path must be included in `src/proxy.ts`'s AuthKit matcher; add a regression test for its anonymous and forged-session boundary.
- Use current official documentation and inspect installed types/source before choosing APIs. Prefer maintained packages, Mastra runtime capabilities and official shadcn components over custom infrastructure.
- Keep product/domain logic in Pilot, Mastra implementation in `pilot-ai`, integration adapters in `pilot-integrations`, and shared design-system sources in `pilot-ui`.
- Keep local, preview and production secrets separate. Never log or commit credentials. Do not expose worker capabilities until system-enforced permissions and approval behavior exist.
- Conversations are Pilot-owned, organization-scoped sessions. Their message records and protected runtime client must remain server-only. Do not enable message submission for an environment until its Turso-backed Mastra runtime and authenticated transport are configured and verified; do not expose tools.
- The chat interface may show only capabilities backed by the protected runtime contract. Research may be enabled only when `PILOT_RESEARCH_ENABLED=true`, the matching runtime is enabled, and the OIDC-authenticated activity callback is configured. Do not add attachment, browser, scratchpad, MCP, write, or approval controls until their events, persistence and authorization behavior exist.
- Execution and activity records are Pilot-owned and organization-scoped. Record lifecycle events from verified server work only; never persist reasoning, tool secrets, tool payloads, URLs, errors, or browser-supplied activity as an audit event. Tool events may persist only a known capability ID, call ID, and server-generated status summary.
- A model ID is configuration input, not authority to select a provider. Development uses allowlisted Kilo Gateway model `kilo/kilo-auto/free`; do not make a generation until its environment-specific configuration and authenticated Pilot-to-runtime transport are configured and tested.
- Run `pnpm check`, `pnpm build`, `pnpm test`, `pnpm test:server`, `pnpm test:db`, and `pnpm audit --audit-level high` for a completed persistence slice. Browser tests require a fresh build; `test:server` verifies Pilot's protected runtime stream parser; `test:db` uses the isolated development Neon database and removes its randomized fixtures. A green build is not evidence of successful authentication or durable execution.
- No `getSignInUrl()` or cookie-writing helpers during Server Component rendering. Use proxy, Route Handlers or Server Actions. Sign-out is a POST Server Action.
- Complete one worker end-to-end before adding broad secondary features. Keep unimplemented behavior explicit in documentation.

# Platform boundaries and first slice

Status: accepted direction; runtime/storage implementation remains pending.

## Decisions

The user selected WorkOS for application authentication. Use the official AuthKit Next.js SDK for OAuth, PKCE, cookies and session refresh, and the official Node SDK for membership checks. WorkOS application-specific client IDs must be used, not another app's default client ID. Do not write a parallel auth implementation.

Pilot owns Organization, Member, Worker, Team, Role, Goal, Task, Assignment, Execution, Conversation, Skill, Knowledge, Integration, Permission, Approval, Activity and Result as product concepts. Introduce each when its behavior is implemented, not as speculative tables or wrappers. Framework/provider types stay at adapters.

Repository responsibility:

- `pilot`: Next.js product, domain, authorization, persistence and application orchestration.
- `pilot-ai`: Mastra runtime, agents, workflows and runtime adapters.
- `pilot-integrations`: modular provider tools, MCP and external integrations.
- `pilot-ui`: shared shadcn-based design tokens and component sources.

The user selected Neon for every database environment and Vercel for deployment. Development and preview must not receive production database credentials. Do not store data on a Vercel function's local filesystem or rely on a continuously running process.

Mastra's maintained Inngest integration documents a Next.js serving adapter and durable workflows. This is a candidate for the execution slice, not proof of deployment durability. Validate compatibility, restart recovery and suspend/resume with the installed packages before accepting it. Do not implement a custom workflow engine.

## Sources checked on 2026-09-05

- [WorkOS AuthKit Next.js](https://github.com/workos/authkit-nextjs) — npm `4.3.1`, MIT; WorkOS Node SDK `10.13.0`, MIT. Installed source inspected as well as current README.
- [WorkOS Next.js guide](https://workos.com/docs/authkit/nextjs).
- Next.js `16.3.4` bundled documentation on authentication, server components and proxy. Read installed docs before editing APIs.
- [shadcn CLI](https://ui.shadcn.com/docs/cli) — `4.21.0`, official registry generated Radix Nova source. Keep components customizable and avoid wrapper layers.
- [Mastra Inngest integration](https://mastra.ai/integrations/deploy/inngest) — npm core `1.64.0`, Inngest adapter `1.8.9`; adapter peer range includes that core release. Not installed yet.
- [Mastra Vercel guidance](https://mastra.ai/integrations/deploy/vercel) — external persistent storage required.
- [Neon CLI projects](https://neon.com/docs/reference/cli-projects) and installed CLI help — PostgreSQL 18, explicit project and organization targeting.
- [Worker persistence decision](0002-worker-persistence.md) — Drizzle/Neon boundary, migration and authorization behavior.

Recheck live versions and maintenance before the next dependency decision. Version observations are dated evidence, not a permanent upgrade policy.

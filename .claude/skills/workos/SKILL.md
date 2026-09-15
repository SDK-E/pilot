---
name: workos
description: Use when adding or touching any page, Server Action, API route, or Route Handler that needs authentication/authorization in pilot, or when working with WorkOS AuthKit, session checks, sign-in/sign-out, or src/proxy.ts.
---

# WorkOS auth rules (pilot)

WorkOS is the required, only auth provider (`@workos-inc/authkit-nextjs`). These rules are from `AGENTS.md` §Security rules — follow them verbatim, don't improvise a variant.

## Session checks

- Every page, Server Action, and API route starts with `getWorkspaceSession()` (or `requireWorkspaceSession()` where the route must always have a session) — see `src/organizations/workspace-session.ts`. This checks both the signed-in WorkOS user and active organization membership.
- Never trust a submitted organization ID or a model decision as authorization — always derive the org from the verified session.
- Conversations, projects, and attachments are creator-scoped within an organization: filter every query by `createdByWorkosUserId`. Membership alone never grants access to another member's data.

## Route matching

- `src/proxy.ts` (`authkitProxy` from `@workos-inc/authkit-nextjs`) has a `config.matcher` listing every authenticated route prefix. A new route group or API path needs a matcher entry here or it renders/serves with no session check at all — this is the actual enforcement point, not just documentation.
- Any new matched route needs an anonymous-request boundary test (asserting an unauthenticated request is rejected) and, where relevant, a forged-session boundary test.

## Runtime callbacks

- `/api/runtime/*` callbacks from the Pilot AI runtime verify the WorkOS M2M token (`src/ai/workos-m2m.ts`) before reading the request body, and derive all ownership from the execution record — never from the payload.

## Things never to do

- No `getSignInUrl()` or any cookie-writing helper during Server Component rendering (Next.js forbids writing cookies mid-render; do it in a Route Handler or Server Action).
- Sign-out is a POST Server Action, never a GET link/route.
- Never log or commit WorkOS credentials; local (`.env.local`), preview, and production secrets are separate — never pull a production `DATABASE_URL` or WorkOS secret locally.

## Reference files

`src/organizations/workspace-session.ts`, `src/proxy.ts`, `src/ai/workos-m2m.ts`, `.env.example` (WorkOS + WorkOS M2M vars), `docs/decisions/0017-workos-m2m-runtime-auth.md`.

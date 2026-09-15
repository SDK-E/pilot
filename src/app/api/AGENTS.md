# AGENTS.md — Route Handlers

Two boundary shapes live under here; know which one a route needs before
changing its auth.

## Session-authenticated routes

`conversations/`, `attachments/`, `projects/`, `project-files/`,
`connectors/[providerId]/authorize`, and `connectors/[providerId]/callback`
are covered by `src/proxy.ts`'s `matcher`, which enforces a WorkOS session
via `authkitProxy` before the handler runs. A new route in this shape must
be added to that matcher, plus an anonymous and forged-session boundary
test (`tests/route-boundary.spec.ts`, `tests/auth-boundary.spec.ts`).

## Server-to-server routes (no WorkOS session, verified another way)

`runtime/*` (verified via a WorkOS M2M token, `isVerifiedPilotRuntimeCallback`
in `src/ai/workos-m2m.ts`) and `marketplace/github/webhook` (verified via an
HMAC-SHA256 signature over the raw body, `GITHUB_MARKETPLACE_WEBHOOK_SECRET`)
are **intentionally excluded** from `src/proxy.ts`'s matcher — the caller is
GitHub or Pilot AI, not a browser with a session cookie. Do not add a route
in this shape to the proxy matcher; doing so breaks the external caller's
delivery, since it has no WorkOS session to present. Verify the request
another way instead (a signed token, an HMAC signature), and read the raw
body before parsing JSON when verifying a signature over it.

# ADR-0017: WorkOS M2M for the Pilot ↔ Pilot AI boundary

Status: implemented on 2026-09-14. Replaces the Vercel-OIDC-based
verification described in the "Verification repairs" section of
[progress.md](../progress.md).

## Decision

Pilot and Pilot AI authenticate each other's requests with a WorkOS M2M
(machine-to-machine) token instead of a Vercel OIDC token. Pilot mints a
token via the OAuth2 `client_credentials` grant against its own WorkOS
Connect application and sends it as `x-pilot-runtime-token`; Pilot AI
verifies it before reading the request body, and echoes the exact same token
back when it calls Pilot's own runtime callbacks
(`/api/runtime/activity`, `/api/runtime/plan`, `/api/runtime/scratchpad`),
which Pilot reverifies identically.

Vercel OIDC only works when both sides are actually deployed on Vercel —
`VERCEL_ENV` is unset in local development, so the old verifier
unconditionally rejected every request outside Vercel. That made this
boundary (and everything routed through it, including the code sandbox and
web search) impossible to exercise locally, forcing every bug to be
reproduced against production, where logs are slow to appear and can mask
the actual failure. WorkOS M2M has no such constraint: the same
`client_credentials` exchange and JWT verification work identically whether
either side is running on Vercel or on a laptop.

Two WorkOS Connect M2M applications exist, one per WorkOS environment
(mirroring "Production" and "local" in the WorkOS dashboard, the same split
`WORKOS_API_KEY` already uses):

|                         | Production                              | Local / Preview                                  |
| ----------------------- | --------------------------------------- | ------------------------------------------------ |
| AuthKit domain (issuer) | `https://refined-valley-87.authkit.app` | `https://modern-technology-87-local.authkit.app` |
| Client ID               | `client_01M2GT0J1HGC03QQW9Z6AXB12H`     | `client_01M2GTBXNA4VZ2ZAGD5VB0Q1CB`              |

Each deployment is configured with the pair for the WorkOS environment it
should trust (`WORKOS_M2M_AUTHKIT_DOMAIN`, `WORKOS_M2M_CLIENT_ID`, and —
Pilot only — `WORKOS_M2M_CLIENT_SECRET`); there is no runtime branching on
`VERCEL_ENV` left. Verification checks a valid signature via
`<domain>/oauth2/jwks`, that `iss` equals the configured domain, and that
`sub` equals the configured client ID. The `aud` claim is deliberately not
checked: it identifies WorkOS's own default AuthKit application for that
environment, not either side of this boundary, and `sub` + `iss` +
signature already fully pin the caller's identity.

## Consequences

- `src/ai/workos-m2m.ts` (Pilot) holds both the token-acquisition logic
  (`getPilotRuntimeToken`, cached until near expiry) and the reverse-callback
  verifier (`isVerifiedPilotRuntimeCallback`). `src/mastra/auth/workos-m2m.ts`
  (Pilot AI) holds only verification — it never needs the client secret.
- `@vercel/oidc` was removed from Pilot's dependencies.
- Local development now exercises this boundary directly: run `pnpm dev`
  (Pilot) and `mastra dev` (Pilot AI) together, with each repo's `.env.local`
  set to the Local-environment values above.
- Unrelated to this change: `@vercel/sandbox` (actually provisioning a code
  sandbox) still authenticates to Vercel's own API via Vercel OIDC or a
  `VERCEL_TOKEN` fallback, and pilot-ai's `skill-preflight.ts` still reads
  the ambient `VERCEL_OIDC_TOKEN` to call the external skills.sh registry —
  neither is part of the Pilot↔Pilot AI boundary this ADR covers.

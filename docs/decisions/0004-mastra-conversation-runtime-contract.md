# Pilot runtime contract

Status: partially implemented. Do not enable this boundary until its Turso storage and authenticated service transport are verified.

## Context

Pilot already owns organization-scoped Workers and Conversations in Neon. A Conversation may be opened by any active member of its organization, so its message history cannot be owned by an individual WorkOS user. The next vertical slice must add a real two-turn model interaction with durable memory without allowing the Mastra runtime to make authorization decisions or activate Kilo Code's browser agent.

The maintained `@mastra/libsql` package is compatible with the installed `@mastra/core` release in `pilot-ai` and connects Mastra to a remote Turso database rather than a local file store. Mastra memory requires a stable resource and thread for persisted history. A thread's resource owner cannot be changed after the thread is created.

## Proposed boundary

`pilot` remains the authorization point. Before a runtime call, its server action or Route Handler must:

1. authenticate the WorkOS user and independently recheck active membership for the selected organization;
2. load the Worker and Conversation with organization-scoped queries;
3. validate the submitted new message and construct a minimal, server-only runtime command; and
4. call an authenticated `pilot-ai` service endpoint. It must never send client-provided history or delegate permission decisions to the model.

The first runtime command must contain only the verified identifiers and configuration needed for generation:

```ts
type GenerateConversationReply = {
  organizationId: string;
  worker: {
    id: string;
    instructions: string;
    modelId: "kilo/kilo-auto/free";
  };
  conversationId: string;
  message: string;
};
```

`pilot-ai` must derive Mastra memory identifiers deterministically:

- resource: the immutable `organizationId` and `worker.id` pair;
- thread: `conversationId`.

That resource scopes history to a Worker inside one organization. The thread scopes it to one Pilot Conversation. Neither identifier may come from a browser request or be reused for a different owner.

The initial agent must have no registered tools, MCP connections, browser access, filesystem access, integrations, delegation, schedules or autonomous workflows. It may only apply the Worker instructions, invoke the explicitly approved model, write the user message and response through Turso-backed Mastra storage, and return a response suitable for Pilot to render.

## Storage and deployment requirements

- Use `@mastra/libsql` with a dedicated matching-environment Turso database for the deployed runtime path. Do not use a file database or local database fallback in that path.
- Keep Pilot domain tables owned by `pilot` in Neon; runtime-owned storage tables stay behind the runtime adapter in Turso. Pilot persists immutable user and Worker message records for audit, activity history and UI rendering; the runtime independently owns its memory storage. Do not use Pilot's records as model history.
- Use an authenticated server-to-server transport. The browser must only call Pilot. Both Vercel projects have team-issued OIDC enabled. Vercel Trusted Sources is the deployment-protection transport: authorize the `pilot` project on `pilot-ai` with Preview-to-Preview and Production-to-Production rules, then forward Pilot's short-lived token in `x-vercel-trusted-oidc-idp-token`. Test the configured issuer, audience, project and production-environment claims before adoption.
- The `pilot-ai` deployment must protect the app-level `POST /pilot/conversations/generate` endpoint with Vercel Deployment Protection. Pilot obtains its short-lived token through `@vercel/oidc` and forwards it as `x-vercel-trusted-oidc-idp-token`; it does not use a long-lived bypass secret. Configure the Pilot Vercel project as a Trusted Source before setting `PILOT_AI_RUNTIME_URL`. Trusted Sources must never make the general `/api/agents` surface a Pilot capability.
- Development generations use Kilo Gateway model `kilo/kilo-auto/free`. Keep it as an explicit allowlisted model. A Worker `modelId` is configuration input, never authority to use any arbitrary provider or model. Verify Kilo Gateway's environment-specific credentials and production limits before production traffic.
- Make the runtime independently deployable and restart-safe. Prove a second process reads the first process's stored history before accepting the slice.

## Acceptance evidence

The first implementation is complete only when an active organization member can send two messages to one Conversation and the second response recalls the first after a fresh runtime process starts. Tests must prove cross-organization, cross-worker and forged-conversation access are rejected; no tool invocation is possible; and the response, model identifier, latency, token usage and cost can be recorded for the later execution/activity slice.

## Sources checked on 2026-09-06

- [Mastra Memory overview](https://mastra.ai/docs/memory/overview): persistent history uses a storage provider and stable `resource` plus `thread` identifiers; the thread resource owner is immutable.
- [Mastra Server overview](https://mastra.ai/docs/server/overview): servers provide middleware and request context, but Pilot remains responsible for its product authorization boundary.
- Installed `@mastra/libsql` `1.22.3` types: `LibSQLStore` accepts a remote `url` and `authToken`; its core peer range is `>=1.63.1-0 <2.0.0-0`, compatible with `pilot-ai`'s installed `@mastra/core` `1.64.0`.
- The running `pilot-ai` Mastra API: its registered `pilot-browser` reports provider `kilo` and model `kilo-auto/free`; user-confirmed as the Kilo Gateway development model.
- [Vercel Trusted Sources](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/trusted-sources): a protected deployment accepts an authorized Vercel project's short-lived OIDC token in `x-vercel-trusted-oidc-idp-token`; same-team projects default to matching-environment rules and `getVercelOidcToken()` forwards the token from a Vercel Function.

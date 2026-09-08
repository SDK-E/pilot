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

The first Research extension is a separate, request-scoped adapter. It can expose
only `web-search` when Pilot has loaded a Research persona whose persisted tool
preference contains that exact capability. It has no Stagehand/browser, MCP,
filesystem, export, scratchpad, delegation, or write tool imports. The runtime
uses the original, short-lived Pilot OIDC token to call Pilot's narrow activity
callback before and after the read-only tool invocation. Pilot independently
verifies that token and accepts only an organization-owned running execution,
then creates a generated lifecycle summary. This callback carries no prompt,
tool arguments, results, URLs, errors, or reasoning, which keeps the OpenAI
completion stream standard while preserving truthful activity history.

Pilot checks `PILOT_RESEARCH_ENABLED=true` immediately before both synchronous
and streamed message paths create a message or execution. The same check is
performed when a new Research conversation is prepared. Disabling the flag
therefore takes effect for existing Research conversations as well as new ones.

For a verified request with OpenAI `stream: true`, the runtime emits
OpenAI-compatible server-sent chat-completion chunks and a final usage chunk.
Pilot consumes that stream through its authenticated server-side client; the
browser never contacts the runtime. Pilot mirrors a Worker response into Neon
only after the runtime's terminal usage event, so a partial or cancelled stream
cannot be represented as a completed answer.

## Storage and deployment requirements

- Use `@mastra/libsql` with a dedicated matching-environment Turso database for the deployed runtime path. Do not use a file database or local database fallback in that path.
- Keep Pilot domain tables owned by `pilot` in Neon; runtime-owned storage tables stay behind the runtime adapter in Turso. Pilot persists immutable user and Worker message records for audit, activity history and UI rendering; the runtime independently owns its memory storage. Do not use Pilot's records as model history.
- Use an authenticated server-to-server transport. The browser must only call Pilot. Both Vercel projects have OIDC enabled. Pilot obtains its short-lived token through `@vercel/oidc`, forwards it to deployment protection in `x-vercel-trusted-oidc-idp-token`, and carries the same token to the application in `x-pilot-runtime-oidc-token` after its WorkOS and tenant checks. The application header is deliberate: deployment protection may consume its trusted-source header. `pilot-ai` verifies the application token with Vercel's JWKS before parsing input and requires a fixed team or global Vercel issuer, team audience, exact `pilot` project, and matching Preview or Production environment subject. Pilot is also configured as a Vercel Trusted Source with Preview-to-Preview and Production-to-Production rules. The application-level validation remains required because standard Vercel Deployment Protection excludes custom domains.
- The deployed runtime surface is only OpenAI-compatible `POST /v1/chat/completions`; no legacy internal adapter or generic `/api/agents` route is deployed. Trusted Sources and OIDC must never make the general Mastra agent surface a Pilot capability.
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

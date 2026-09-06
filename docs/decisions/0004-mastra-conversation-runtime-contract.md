# Mastra conversation runtime contract

Status: proposed. Do not deploy this boundary until its Neon storage and authenticated service transport are verified.

## Context

Pilot already owns organization-scoped Workers and Conversations in Neon. A Conversation may be opened by any active member of its organization, so its message history cannot be owned by an individual WorkOS user. The next vertical slice must add a real two-turn model interaction with durable memory without allowing the Mastra runtime to make authorization decisions or activate Kilo Code's browser agent.

The maintained `@mastra/pg` package is compatible with the installed `@mastra/core` release in `pilot-ai` and uses PostgreSQL rather than a local file store. Mastra memory requires a stable resource and thread for persisted history. A thread's resource owner cannot be changed after the thread is created.

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
    modelId: string;
  };
  conversationId: string;
  message: string;
};
```

`pilot-ai` must derive Mastra memory identifiers deterministically:

- resource: the immutable `organizationId` and `worker.id` pair;
- thread: `conversationId`.

That resource scopes history to a Worker inside one organization. The thread scopes it to one Pilot Conversation. Neither identifier may come from a browser request or be reused for a different owner.

The initial agent must have no registered tools, MCP connections, browser access, filesystem access, integrations, delegation, schedules or autonomous workflows. It may only apply the Worker instructions, invoke the explicitly approved model, write the user message and response through Neon-backed Mastra storage, and return a response suitable for Pilot to render.

## Storage and deployment requirements

- Replace every `LibSQLStore`, file database and local database fallback in the deployed runtime path with `@mastra/pg` backed by the matching environment's Neon PostgreSQL database.
- Keep Pilot domain tables owned by `pilot`; Mastra-owned storage tables stay behind the runtime adapter. Do not duplicate message history into an application table before proving which records Mastra persists and how they are queried.
- Use an authenticated server-to-server transport. The browser must only call Pilot. Vercel OIDC is a candidate because it is enabled for the current project, but its current verification contract must be tested before adoption.
- The existing `pilot-ai` Vercel deployment protects `/api/agents` with Vercel SSO. Preserve that protection; an unauthenticated request redirecting to Vercel login is not a usable Pilot runtime integration.
- Development generations use Kilo Gateway model `kilo/kilo-auto/free`. Keep it as an explicit allowlisted model. A Worker `modelId` is configuration input, never authority to use any arbitrary provider or model. Verify Kilo Gateway's environment-specific credentials and production limits before production traffic.
- Make the runtime independently deployable and restart-safe. Prove a second process reads the first process's stored history before accepting the slice.

## Acceptance evidence

The first implementation is complete only when an active organization member can send two messages to one Conversation and the second response recalls the first after a fresh runtime process starts. Tests must prove cross-organization, cross-worker and forged-conversation access are rejected; no tool invocation is possible; and the response, model identifier, latency, token usage and cost can be recorded for the later execution/activity slice.

## Sources checked on 2026-09-06

- [Mastra Memory overview](https://mastra.ai/docs/memory/overview): persistent history uses a storage provider and stable `resource` plus `thread` identifiers; the thread resource owner is immutable.
- [Mastra Server overview](https://mastra.ai/docs/server/overview): servers provide middleware and request context, but Pilot remains responsible for its product authorization boundary.
- npm metadata for `@mastra/pg` `1.22.3`: Apache-2.0, Node `>=22.13.0`, and core peer range `>=1.63.1-0 <2.0.0-0`; compatible with `pilot-ai`'s installed `@mastra/core` `1.64.0`.
- The running `pilot-ai` Mastra API: its registered `pilot-browser` reports provider `kilo` and model `kilo-auto/free`; user-confirmed as the Kilo Gateway development model.

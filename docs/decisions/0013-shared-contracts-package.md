# ADR 0013 — Shared contracts package

Status: proposed (implementation in progress).

## Context

Two DTO sources define the same conversation command:

- `pilot-ai/src/conversation/command.ts` — the runtime command DTO (`worker={id,instructions,modelId}`, `modelId=z.literal(config.modelId)`)
- `pilot/src/ai/pilot-ai-client.ts` — the cross-repo request DTO (`worker={…,baseAgentId,enabledToolIds,approvalRules}`, `modelId=z.literal("kilo/kilo-auto/free")`)

These drift independently and must be consolidated into a single versioned package.

## Decision

Create a shared contracts module inside `pilot-ai`, exported publicly as `@pilot/conversation-contracts`:

- **Location**: `pilot-ai/src/conversation/contract.ts`
- **Exports**: `generateConversationReplySchema`, `type GenerateConversationReply`, `createConversationResourceId`, `createProjectResourceId`, `createMemoryResourceId`, `PILOT_CONVERSATION_MODEL_ID`, `ALLOWED_TOOL_IDS`, `BASE_AGENT_IDS`
- **Rules**: module PURE — no `@mastra/*` imports, no `process.env` reads, no hardcoded provider/language beyond the existing allowlist
- **Consumption**: pilot consumes via version npm pinnée (jamais main/workspace link)

## Implementation status

- `pilot-ai/src/conversation/contract.ts` — created
- `pilot-ai/src/conversation/command.ts` — re-exports from contract.ts, removed config.ts import
- `pilot-ai/src/conversation/openai-compatible.ts` — uses `PILOT_CONVERSATION_MODEL_ID` from contract.ts
- `pilot-ai/src/conversation/config.ts` — removed modelId (kept maxRetries/maxSteps/tokenLimit/lastMessages)
- `pilot/src/ai/pilot-ai-client.ts` — BLOCKED: cross-repo consumption pending publication (documented with TODO import)
- `pilot/tests/contract-import.test.ts` — BLOCKED: import test gated on publication

## Open items

- Publication of `@pilot/conversation-contracts` (plan 04/13 provision or npm publish)
- Consommateur Pilot inter-repo → BLOCAC jusqu'à publication

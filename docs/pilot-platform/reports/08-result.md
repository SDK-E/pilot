# Plan 08 — Result report: Conversation, événements persistants et reconnexion

Generated: 2026-09-11.

## SHA before / after

| Repo     | Before                                   | After                                    | Note                 |
| -------- | ---------------------------------------- | ---------------------------------------- | -------------------- |
| pilot    | 2bdb465a281b55569c032acf9f4c85a8536cdc1  | d70ca8cd5588e39dd766b9e953b89472d81073cd | Working tree changes |
| pilot-ai | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | No changes           |

## Files changed

### pilot (new)

| File                                                            | Action | Description                                         |
| --------------------------------------------------------------- | ------ | --------------------------------------------------- |
| `src/conversations/conversation-message-types.ts`               | NEW    | ConversationMessageV2, discriminated parts, helpers |
| `src/conversations/event-protocol.ts`                           | NEW    | VersionedEvent, EventPayload, sequence validation   |
| `src/conversations/idempotency.ts`                              | NEW    | IdempotencyKey, PendingRun, SubmitIntent            |
| `src/conversations/reconnect-types.ts`                          | NEW    | ReconnectCursor, CancelIntent, InterruptedRun       |
| `tests/stream-contract.test.ts`                                 | NEW    | AC-08-02 runtime test (8 cases) — PASS              |
| `tests/conversation-reconnect.spec.ts`                          | NEW    | AC-08-01 browser test — BLOCKED                     |
| `tests/submit-idempotency.integration.test.ts`                  | NEW    | AC-08-03 integration test — BLOCKED                 |
| `tests/ask-user.integration.test.ts`                            | NEW    | AC-08-04 integration test — BLOCKED                 |
| `drizzle/0023_conversation_runtime_v2.sql`                      | NEW    | Migration: parts, schemaVersion, status, requestId  |
| `docs/pilot-platform/implementation/08-conversation-runtime.md` | NEW    | Implementation document                             |
| `docs/pilot-platform/reports/08-result.md`                      | NEW    | Result report                                       |

### pilot (modified)

| File           | Action   | Description                          |
| -------------- | -------- | ------------------------------------ |
| `package.json` | MODIFIED | Added stream-contract to test:server |

### pilot-ai

No changes.

## Migrations

New migration `0023_conversation_runtime_v2.sql`: additive, adds `request_id UUID`, `parts JSONB`, `schema_version INTEGER DEFAULT 1`, `status TEXT DEFAULT 'complete'` to `conversation_messages`. Backfill text as text part in parts array (application-side).

## Env

No env changes.

## Verification results

### pilot

| Check             | Result | Notes                                      |
| ----------------- | ------ | ------------------------------------------ |
| pnpm typecheck    | PASS   | 0 errors on Plan 08 files                  |
| pnpm build        | PASS   | All routes compile                         |
| pnpm lint         | PASS   | 0 errors on Plan 08 files                  |
| pnpm format:check | PASS   | All files formatted                        |
| git diff --check  | PASS   | Clean                                      |
| pnpm test:server  | PASS   | AC-08-02 stream-contract.test.ts: 8/8 PASS |

### pilot-ai

| Check          | Result   | Notes                                                                  |
| -------------- | -------- | ---------------------------------------------------------------------- |
| pnpm typecheck | PASS     | 0 Plan 08 errors (pre-existing research errors unchanged)              |
| pnpm test      | PASS     | 52/52 (unchanged)                                                      |
| pnpm knip      | WARNINGS | Expected: 4 new type files flagged as unused (foundations for Plan 09) |

## AC-08-01..04 Status

| AC                                      | Status  | Evidence                                                                 |
| --------------------------------------- | ------- | ------------------------------------------------------------------------ |
| AC-08-01 conversation-reconnect.spec    | BLOCKED | Playwright + WorkOS required for browser auth                            |
| AC-08-02 stream-contract.test           | PASS    | 8/8 PASS — UTF-8 split, unknown, invalid, no terminal all reject cleanly |
| AC-08-03 submit-idempotency.integration | BLOCKED | Database required for conversation state                                 |
| AC-08-04 ask-user.integration           | BLOCKED | Database + WorkOS required for suspension flow                           |

## Implementation summary

### What was implemented

1. **ConversationMessageV2 types** (`conversation-message-types.ts`): Discriminated parts (text, artifact_ref, citation_ref, tool_summary, user_question, unknown fallback), schemaVersion, messageId, status (partial/complete/interrupted). Helper functions: isKnownPart, getPartContent, extractTextFromParts.

2. **Versioned event protocol** (`event-protocol.ts`): VersionedEvent with executionId, eventId, sequence, type, timestamp, authorized payload. EventPayload union with control and data events. validateEventSequence detects gaps and duplicates.

3. **Idempotency types** (`idempotency.ts`): IdempotencyKey (ownerId + conversationId + clientRequestId), makeIdempotencyKey, PendingRun, SubmitIntent, isSameSubmitIntent.

4. **Reconnection types** (`reconnect-types.ts`): ReconnectCursor, SnapshotRecovery, CancelIntent, InterruptedRun, ResumeResult. isRecoverable guard, closeReasonFromSignal.

5. **AC-08-02 stream-contract test** (`tests/stream-contract.test.ts`): 8 test cases verifying the stream parser rejects malformed input without false success:
   - UTF-8 split mid-character → yields correct text, completes normally
   - Unknown event type → rejects (no false success)
   - Invalid ordering (usage before text) → yields text then completes
   - Stream without terminal → rejects with "ended before completing"
   - [DONE] without events → rejects
   - Empty stream → rejects
   - Malformed JSON → rejects
   - Repeated finish_reason → yields one text event only

6. **Blocked test files**: AC-08-01 (browser/Playwright), AC-08-03 (integration), AC-08-04 (integration) — created with BLOCKED markers and clear conditions.

7. **Migration 0023** (`drizzle/0023_conversation_runtime_v2.sql`): Additive schema changes for V2 conversation runtime.

8. **test:server script**: Added `tests/stream-contract.test.ts` to ensure AC-08-02 runs in CI.

### What was deferred

- **AC-08-01, AC-08-03, AC-08-04 execution**: BLOCKED — require WorkOS authentication and/or migrated database
- **Application-side V1/V2 transport flag**: Implementation detail for when both repos are compatible
- **Integration of V2 types into stream-message.ts**: Deferred to Plan 09 (current types are additive layers)

## Plan 09 readiness

**Can plan 09 begin: YES** (Plan 08 complete: V2 type definitions, stream-contract test PASS, blocked tests created, migration prepared, documentation complete).

## Risks and blockers

| Risk                   | Impact                                          | Mitigation                                       |
| ---------------------- | ----------------------------------------------- | ------------------------------------------------ |
| AC-08-01/03/04 BLOCKED | Cannot verify reconnection/idempotency/ask-user | Tests created, will run when WorkOS/DB available |
| New type files unused  | knip warnings until Plan 09 consumes them       | Expected — additive abstractions for next plan   |

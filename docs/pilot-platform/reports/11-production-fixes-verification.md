# Production Fixes Deployment Report

**Commit:** a17ea0d  
**Deployment:** https://pilot-p42sxipxt-sdk-enterprises.vercel.app  
**Production URL:** https://pilot.sdk.enterprises  
**Date:** 2026-09-12  
**Status:** BUILD PASSED / DEPLOYMENT READY

## What Changed

- **Fix 1 — First-message routing:** `POST /api/conversations/stream` now returns a `Location` header. `NewChatForm` navigates via `useEffect` on `isLoading` transitioning `true→false`, with `router.refresh()` to update the sidebar. No more race condition where stalled streams prevented navigation.
- **Fix 2 — Generation timeout & recovery:** Client-side 60s timeout in both `NewChatForm` and `ConversationShell`. On timeout, shows a clear warning with Review message and Cancel buttons. Server-side 90s timeout wrapper added to `stream-message.ts`. The recovery action restores the message for review rather than re-sending it automatically, because duplicate execution protection is not implemented yet.
- **Fix 3 — Whitespace validation:** Empty or whitespace-only submissions now show an accessible inline error ("Message cannot be blank."), focus the textarea, set `aria-invalid="true"`, and clear on typing.
- **Fix 4 — Starter cards:** Plan, Draft, and Research cards on `/workspace` are now interactive `<Button>` elements. Clicking navigates to `?mode=` and pre-fills the composer with a template. Research card disables when no research agent is available.

## Files Modified

- `src/app/api/conversations/stream/route.ts`
- `src/app/workspace/page.tsx`
- `src/components/conversations/conversation-shell.tsx`
- `src/components/conversations/new-chat-form.tsx`
- `src/conversations/stream-message.ts`

## Verification

- `pnpm lint` — passed
- `pnpm typecheck` — passed
- `pnpm format:check` — passed
- `pnpm build` — passed
- `pnpm test` (Playwright) — 22 passed, 3 skipped (pre-existing WorkOS/DB blockers)
- `pnpm test:server` — 72 passed
- `pnpm test:db` — 1 passed
- Vercel production build — completed successfully, migrations applied

## End-to-End Test Instructions for Phi

Please test the following flows on the production URL:

### 1. First-message routing

1. Open https://pilot.sdk.enterprises
2. Sign in with a WorkOS test account (if needed; anonymous/public tests already pass)
3. Type a unique prompt in the composer and submit
4. Verify the URL changes to `/workspace/workers/{workerId}/conversations/{conversationId}`
5. Verify the message appears on the conversation page
6. Refresh the page — the conversation and message should persist
7. Check the sidebar under "Chats" — the new conversation should appear immediately with a derived title, correct agent, and generation status

### 2. Generation timeout & recovery

1. In a new or existing conversation, submit a prompt
2. If the runtime is slow, wait 60 seconds — the UI should warn that the request may still have completed, with Review message and Cancel buttons
3. Click Review message — the prompt should return to the composer without re-sending. Review or edit it before sending.
4. Click Cancel — the pending state should clear and the composer should return to idle
5. Click "Stop generating" during an active response — it should abort cleanly

### 3. Whitespace validation

1. Submit an empty message (no text) — should show "Message cannot be blank.", focus the textarea, and show `aria-invalid`
2. Submit spaces-only — same behavior
3. Start typing — the error should clear immediately
4. Submit a very long message (>10k characters) — should be rejected by the textarea maxLength

### 4. Starter cards

1. On the workspace homepage, click **Plan** — should navigate to `/workspace?mode=plan` and pre-fill the composer with "Help me plan: "
2. Click **Draft** — should pre-fill with "Help me draft: "
3. Click **Research** — should pre-fill with "Research: " (only if a research agent is available in the org; otherwise the card should be disabled with a tooltip)
4. Tab through the cards and activate with Enter/Space — keyboard accessibility should work

### 5. Recovery / navigation edge cases

- Navigate away from an active generation and back — the conversation should preserve its state
- Use browser Back/Forward — the composer and conversation should remain coherent
- Open the same conversation in two tabs — both should remain functional

## Notes for Testing

- Research starter card behavior depends on `PILOT_RESEARCH_ENABLED=true` and an available research agent in the org. If those are not present, the card is intentionally disabled.
- Runtime responsiveness depends on the live `PILOT_AI_RUNTIME_URL` environment. Timeout behavior is most reliably triggered by simulating network latency or runtime slowness.
- All existing Playwright boundary tests (22 passed) remain green; the three skipped tests require hosted WorkOS membership fixtures and are unchanged.

## 2026-09-13 workspace interaction correction

This verified UI slice restores a conversational hierarchy in an existing chat:

- the shell now stacks the conversation header, independently scrollable transcript, and persistent composer within the workspace viewport;
- task creation opens a keyboard-accessible shadcn dialog instead of sharing the composer surface;
- the side panel uses plain-language sections for Agent activity, Working notes, Tasks, and Needs your approval, with actionable empty states;
- project assignment is labelled Choose project and communicates the no-project state in its menu;
- a timed-out existing-chat message is restored for review rather than sent again automatically, and Stop aborts the active client stream;
- all persisted messages expose a keyboard-discoverable Copy action;
- `mod_enter` consistently inserts a line break on plain Enter, while Ctrl/Command+Enter sends.

Verification before deployment: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm build`, and `pnpm test:server` (72 passing) pass. `pnpm test` reports 25 passing and 42 explicitly skipped authenticated-fixture scenarios. `pnpm knip` still reports the pre-existing Plan 11 unused-file/export backlog; this UI slice adds no new Knip findings.

## 2026-09-13 history identification update

The creator-scoped chat history query now returns each chat’s agent, last visible message preview, and update time. The sidebar and Chats page render that context so duplicate titles are distinguishable without widening organization access. Existing rename and destructive-confirmation deletion controls remain available from Chats.

Verification before deployment: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test:server` (72 passing), and `pnpm build` passed.

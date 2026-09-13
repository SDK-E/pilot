# Production Fixes Deployment Report

**Commit:** a17ea0d  
**Deployment:** https://pilot-p42sxipxt-sdk-enterprises.vercel.app  
**Production URL:** https://pilot.sdk.enterprises  
**Date:** 2026-09-12  
**Status:** BUILD PASSED / DEPLOYMENT READY

## What Changed

- **Fix 1 — First-message routing:** `POST /api/conversations/stream` now returns a `Location` header. `NewChatForm` navigates via `useEffect` on `isLoading` transitioning `true→false`, with `router.refresh()` to update the sidebar. No more race condition where stalled streams prevented navigation.
- **Fix 2 — Generation timeout & recovery:** Client-side 60s timeout in both `NewChatForm` and `ConversationShell`. On timeout, shows "Generation timed out" with Retry/Cancel buttons. Server-side 90s timeout wrapper added to `stream-message.ts`. Retry re-sends the same prompt idempotently.
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
2. If the runtime is slow, wait 60 seconds — the UI should show "Generation timed out. The request took longer than expected." with Retry and Cancel buttons
3. Click Retry — the same prompt should re-send and start a new stream
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

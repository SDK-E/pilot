# AGENTS.md — Workspace route group

## Purpose

The authenticated app shell: `[mode]` (`/chat`, `/work`, `/code` and their
`[conversationId]` sub-route), `agents/`, `projects/`, `settings/`.

## Rules

- This route group is a session boundary, not just an organizational one.
  `layout.tsx` calls `withAuth()` and redirects to `/sign-in` when there is
  no user, then `getWorkspaceSession()` for the organization-scoped session
  — every page and Server Action nested here relies on that layout having
  run, but each Server Action and API route must still call
  `getWorkspaceSession()`/`requireWorkspaceSession()` itself rather than
  trusting the layout alone (root AGENTS.md §Security rules; see the
  `workos` skill).
- A new page or route segment added under this group must also be added to
  `src/proxy.ts`'s `config.matcher`, or it renders with no session check at
  all — see the comment directly above that matcher.
- `[mode]` is generic over the three agent kinds (`chat`/`work`/`code`) from
  `src/agents/agent-kinds.ts` — don't fork per-kind logic into separate
  route folders; branch on the kind id instead.
- Keep data fetching and mutations creator-scoped
  (`createdByWorkosUserId`) even though the layout already narrows to one
  organization.

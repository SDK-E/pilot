# Chat workspace interface

Status: accepted for the first production interface slice.

Pilot's primary product surface is a conversation workspace. The interface uses
the existing shadcn responsive sidebar and AI Elements conversation/message
primitives. Its applied shadcn `b2qMYtuMc` preset defines both the light
`:root` and dark `.dark` color tokens; JetBrains Mono is the interface font.
The maintained `next-themes` provider defaults to the operating system setting,
persists a user choice, and exposes System, Light, and Dark controls on the
public and authenticated headers.
The Pilot mark is rendered as text: expanded navigation shows `Pilot.` and
collapsed navigation shows `P.`. Image branding belongs only in the favicon.

The New chat screen lets an active organization member choose one of that
organization's configured Conversational personas. If none exists, Pilot
creates the organization-scoped `Pilot` Conversational persona only after a
non-empty message is submitted. The action rechecks WorkOS membership and
scopes a submitted persona ID to the active organization. It rejects every
other base-agent type, so a browser form cannot route a chat into Research or
another future agent merely by changing a hidden field.

Research is visible as unavailable in the agent chooser. Its configured tools
and local development implementation are not a production capability until a
tenant-scoped adapter enforces the tool policy and approval boundary. The same
rule applies to attachments, streaming tool traces, browser/scratchpad views,
and reasoning detail: do not add interactive controls until their runtime event
contract, durable records, and authorization checks are implemented.

The interface displays a collapsed, transient “Pilot is responding”
activity only while the browser has an active protected stream. It reports the
observed generation state, not model reasoning or a tool action, and is
replaced by Pilot’s persisted execution activity after the request resolves.

The existing conversation server action remains the source of truth for a
message lifecycle. Pilot creates no conversation until a message is submitted,
and messages, executions, and completed activity are persisted through the
authorized Pilot-to-runtime path. The UI displays completed activity in a
collapsed disclosure. The opening message receives a local, deterministic title
without another model request, and the newest organization-scoped conversations
appear in the expanded sidebar for direct return to a chat. New and existing conversations stream text through WorkOS-authorized Pilot
routes while the runtime remains tool-free. A new conversation is created only
after its validated first prompt; Pilot persists that prompt before streaming
and the complete assistant message plus execution only after the stream ends.
Streaming tool traces, browser/scratchpad views, and reasoning detail remain
unimplemented because their event, persistence, and approval contracts are not
yet present.

The desktop conversation rail groups safe, persisted runtime activity, tasks,
and approvals for the open chat. Activity is collapsed by default and expands
into a timeline of the same sanitized server-generated summaries used by the
live feed. A member may add a manual task only to a chat they own; task and
approval records from other chats or members are never shown. Approval records
are read-only until the protected Mastra suspension and decision contract is
implemented.

Composer behavior is a Pilot-owned per-user preference. The default preserves
new lines and sends with Ctrl/⌘ + Enter; a user may choose Enter to send, with
Shift + Enter then adding a new line. The same preference is applied to both
new-chat and existing-chat composers, and composition events never submit a
partially entered IME character.

The sidebar keeps New chat at the top and the current user’s private chat
history at the bottom, with scrolling provided by the shadcn Sidebar when the
history grows. Dashboard and the unavailable-but-explicit Projects entry sit
above the account menu. The account menu displays the signed-in profile,
provides only WorkOS-active organizations, reuses the server-side membership
check before changing the session organization, and signs out through a POST
Server Action. Agent fleet and Personas are reached through Settings.

If a runtime request fails after Pilot has persisted the submitted user message,
Pilot takes the user to that conversation rather than leaving it hidden on the
new-chat screen. The failed execution is rendered as a collapsed error activity
beside the recoverable conversation, where the user can retry with the normal
composer.

## Sources checked on 2026-09-07

- [AI Elements](https://ai-sdk.dev/elements) and the official Conversation,
  Message, Prompt Input, and Reasoning registry metadata.
- [shadcn/ui](https://ui.shadcn.com/docs) and the installed Radix Nova
  components.
- Installed Next.js `16.3.4` documentation for Server Actions and Server/
  Client Component boundaries.

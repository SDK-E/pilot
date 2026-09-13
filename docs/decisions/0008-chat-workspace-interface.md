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

Research is available when the configured production feature flag is enabled.
The tenant-scoped, hardened `web-search` adapter is available to either a
Conversational or Research persona only when that persona enables it and saves
an explicit `allow` or `ask` rule. `allow` executes it directly and `ask`
suspends the exact Mastra call for a creator-scoped approval before external
access. Attachments, browser and scratchpad views, and reasoning detail remain
absent until their runtime event contract, durable records, and authorization
checks are implemented.

The interface displays a collapsed live activity during a protected stream.
It starts with the observed generation state and expands into the same
sanitized server-generated execution and capability lifecycle summaries that
are persisted for the chat. It never represents hidden model reasoning,
prompts, tool inputs, outputs, URLs, errors, or secrets.

Pilot creates no conversation until a message is submitted, and messages,
executions, and completed activity are persisted through the authorized
Pilot-to-runtime path. The validated opening prompt creates its private chat,
then the browser navigates to that chat immediately and streams there. Once the
stream closes, the browser fetches an authenticated owner-scoped message
snapshot and updates the transcript in place; it does not require a page
refresh. This also makes a persisted Ask User suspension and its choices
available in the active session. The opening message receives a local,
deterministic title without another model request. New and existing chats use
the same WorkOS-authorized streaming route. Both agent bases can use only their
explicitly authorized capabilities.

The docked composer and the chat header remain fixed while only the transcript,
activity rail, or sidebar history scrolls. The composer uses the maintained AI
Elements Prompt Input and attachment primitives: it stays compact, supports
keyboard submission preferences, offers a file action menu, previews selected
files, and preserves Pilot's server-authorized attachment upload boundary. The
header names the selected persona rather than its internal base-agent type. The
user can rename or delete the open private chat; deletion redirects to New chat
only after the server action has confirmed it.

The live activity disclosure uses AI Elements Chain of Thought as a readable
visual trace of Pilot's verified execution and tool lifecycle summaries. It is
collapsed by default. On narrow layouts, the full details rail is itself a
collapsed disclosure. This is not raw model chain-of-thought: Pilot never
stores or displays private reasoning, prompts, tool arguments, tool results,
URLs, errors, or credentials.

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

An active organization member can set the organization’s default agent in
Settings. The preference is stored in Pilot, and a new chat begins with that
agent selected while still allowing the user to choose another available agent
before submitting. The update action and repository both verify that the
selected agent belongs to the active organization. Removing an agent clears
the database preference through its foreign key; new chat then selects the
first available agent until a new default is saved.

The sidebar keeps New chat at the top and the current user’s private chat
history at the bottom, with scrolling provided by the shadcn Sidebar when the
history grows. Dashboard and Projects sit above the account menu. Projects
currently organize only the creator's conversations and store project
instructions; they do not make shared memory, files, or knowledge available to
the runtime. The account menu displays the signed-in profile,
provides only WorkOS-active organizations, reuses the server-side membership
check before changing the session organization, and signs out through a POST
Server Action. Agent fleet and Personas are reached through Settings.

Private chat history is reached through the Command-K palette rather than a
standalone Chats page. It contains only the signed-in creator's conversations
and opens them directly. Renaming changes only the Pilot title; it does not
alter messages, activity, tasks, approvals, or Mastra memory. Both rename and
delete actions scope the active organization, selected persona, conversation
ID, and creator ID on the server.

If a runtime request fails after Pilot has persisted the submitted user message,
Pilot takes the user to that conversation rather than leaving it hidden on the
new-chat screen. The failed execution is rendered as a collapsed error activity
beside the recoverable conversation, where the user can retry with the normal
composer.

## Sources checked on 2026-09-07

- [AI Elements](https://ai-sdk.dev/elements) and the official Conversation,
  Message, Prompt Input, Attachments, and Chain of Thought registry metadata.
- [shadcn/ui](https://ui.shadcn.com/docs) and the installed Radix Nova
  components.
- Installed Next.js `16.3.4` documentation for Server Actions and Server/
  Client Component boundaries.

The new-chat selector and organization default use the same environment
availability rule as server-side conversation preparation. A disabled Research
runtime is omitted from both controls, and the default-agent Server Action
rejects a forged or stale disabled Research ID before saving it.

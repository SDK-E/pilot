# Agent fleet experience

Status: accepted product direction; implementation proceeds in narrow, verified slices.

Pilot opens on a conversational chat. A collapsible sidebar provides New chat,
Chats, Agent fleet, Personas, Dashboard, and Settings. Its collapsed mark is
`P`; the expanded mark is `Pilot.` with the dot in Pilot green.

Every organization owns its configurable Conversational base agent. Selecting
an agent always starts a new chat. A persona is a configurable instance of a
base agent, not a separate runtime architecture. It may define a name, avatar,
base agent, goals, general instructions, tone, output format, enabled tools,
knowledge sources, and approval rules. Fields can be optional. Pilot will also
support entirely new base-agent types when their runtime adapter exists.

Research is a distinct base-agent capability. Its intended first tools are web
search, LangSearch, browser actions, document/file analysis, GitHub through
MCP, scratchpad, and user questions. It cannot be selectable in production
until Pilot owns a tenant-scoped service adapter that allowlists each capability,
selects credentials outside model control, applies the persona approval rule,
and emits authenticated execution events.

Conversation activity is live. The default UI shows a concise collapsed status;
expanded activity shows tool calls and results, reasoning summaries, and detailed
events. Browser and scratchpad views appear inline when used. Attachments cover
PDFs and documents, images, spreadsheets/CSV/Excel, and source code.

Approval modes are `ask`, `allow`, `deny`, and `auto-classifier`. The
classifier may never self-authorize sensitive, destructive, financial,
production, or externally visible actions: those always require the policy's
explicit approval path.

The Dashboard prioritizes active agents, running tasks, usage/cost, and token
metrics. It is a read model over persisted executions and activity; it must not
infer state from a browser session.

## Delivery sequence

1. Agent-fleet shell, built-in Conversational configuration, persisted persona
   configuration, and new-chat selection.
2. Streaming Conversational transport with persisted execution and activity
   events, rendered through AI Elements.
3. Attachment ingestion/storage and tenant-scoped knowledge references.
4. Research service adapter with the first read-only capabilities and collapsed
   live tool activity.
5. Approval modes, browser/scratchpad views, then write-capable integrations.

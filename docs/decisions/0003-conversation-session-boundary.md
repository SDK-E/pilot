# Conversation session boundary

Status: accepted for the pre-runtime conversation slice.

Pilot owns a Conversation as an organization-scoped session attached to one Worker and created by a WorkOS user. Its UUID is the stable identifier that the future Mastra adapter will receive as a thread ID. The UUID is not a Mastra concept in Pilot's user interface or domain model.

Creating a conversation verifies the signed-in user's active membership for the selected organization in the Server Action, then verifies that the Worker belongs to that organization before inserting. Conversation reads scope the organization, Worker, and conversation ID together. These checks are deliberate even though the detail route already has proxy protection: session cookies and route parameters are never authorization evidence by themselves.

The current route lets authorized members create, list, and inspect empty session records. It intentionally has no message input, model call, tool, memory write, or execution. Adding an application-owned message table or local runtime cache now would duplicate the future Mastra memory store and leave unclear ownership. The next conversation/runtime slice must use Neon-backed Mastra storage, bind this Conversation ID as a Mastra thread, authorize the resource outside the model, and prove two-turn memory after a fresh process restart.

## Sources checked on 2026-09-06

- Installed Next.js `16.3.4` documentation for Server Actions and forms: server actions must authenticate and authorize internally, not rely on where their forms are rendered.
- Installed Mastra core `1.64.0` skill references for message history, memory, durable agents, and storage. Those capabilities are candidates for the next runtime slice; none are connected by this decision.

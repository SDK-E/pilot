# Conversation session boundary

Status: superseded by the implemented runtime contract in
[0004](0004-mastra-conversation-runtime-contract.md).

Pilot owns a Conversation as an organization-scoped session attached to one Worker and created by a WorkOS user. Its UUID is the stable identifier that the future Mastra adapter will receive as a thread ID. The UUID is not a Mastra concept in Pilot's user interface or domain model.

Creating a conversation verifies the signed-in user's active membership for the selected organization in the Server Action, then verifies that the Worker belongs to that organization before inserting. Conversation reads scope the organization, Worker, conversation ID, and creator ID together. Message reads and inserts repeat that creator scope in the repository. These checks are deliberate even though the detail route already has proxy protection: session cookies and route parameters are never authorization evidence by themselves.

This was the boundary for the initial empty-session slice. Pilot now owns its
auditable message and execution records, while the deployed runtime owns
Turso-backed Mastra memory. The active contract binds the verified
organization/agent pair to a runtime resource and the Pilot conversation ID to
a runtime thread. See [0004](0004-mastra-conversation-runtime-contract.md) for
the current boundary.

## Sources checked on 2026-09-06

- Installed Next.js `16.3.4` documentation for Server Actions and forms: server actions must authenticate and authorize internally, not rely on where their forms are rendered.
- Installed Mastra core `1.64.0` skill references for message history, memory, durable agents, and storage. Those capabilities are candidates for the next runtime slice; none are connected by this decision.

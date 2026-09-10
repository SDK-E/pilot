# Project boundary

Status: private project instructions, opt-in shared conversational memory, and
bounded private Project files are implemented; semantic knowledge retrieval is
pending a separate contract.

A Project is a Pilot-owned, creator-scoped collection of that creator's
conversations inside one WorkOS organization. The `projects` table stores the
name and optional instructions. `project_conversations` associates a Project
with a conversation using a composite key and cascading foreign keys.

Every project repository query includes the active organization and the
creator's WorkOS user ID. Adding a conversation independently verifies that
the conversation has the same organization and creator. This prevents a member
from using a project form to discover or attach another member's private chat.
The creator can remove an association without deleting the underlying chat.
Deleting a Project requires the same creator scope and cascades only its
associations; it never deletes the underlying conversations or messages.
One conversation belongs to one Project at a time. Adding it to another Project
moves the association, making future project memory scope unambiguous.
The chat header exposes the creator's private projects as a compact picker, so
the same protected move or removal is available where a conversation is being
worked on. The browser submits only a conversation ID and optional project ID;
the Server Function reloads ownership and membership before it changes either
association.
Before Pilot moves or removes an association from a project with shared memory,
it clears the former project's runtime resource using the verified owner,
organization, worker, and project identifiers. Cleanup happens before the
database mutation; if it fails, the original association remains intact. This
conservative reset also clears summaries for the project's remaining chats,
rather than risk exposing a removed chat through resource-scoped observations.

Pilot resolves project context only on its server after it has verified the
conversation's organization and creator. It sends a typed, authenticated project
command to Pilot AI; the browser never submits a project ID, instructions, or
memory setting to the runtime. Project instructions are therefore available to
the assigned agent without changing tool or data-access rules.

Shared project memory is an explicit per-project setting, disabled by default.
When enabled, Pilot AI uses the project as a Mastra resource and keeps each
conversation as its own thread. Its Mastra Observational Memory is scoped to
that resource, so it can build context across the Project's private
conversations. The observer model is the already configured and allowlisted
Kilo Gateway model (`kilo/kilo-auto/free`), selected by the user for this
runtime. Project files use private Blob storage, owner-scoped metadata, and
bounded untrusted excerpts after the current Project association is verified.
Semantic knowledge retrieval, project sharing, and cross-user project memory
remain unavailable: they each need their own protected storage, retrieval,
authorization, and deletion contracts.
Deleting a project first removes every runtime thread associated with its
enabled project-memory resources, then deletes the Pilot project and its
associations. The underlying Pilot conversations remain in Chat history.

## Sources checked on 2026-09-08

- Installed `@mastra/memory` `1.28.2` types and the current
  [Mastra Observational Memory documentation](https://mastra.ai/docs/memory/observational-memory): resource-scoped observations span threads for the
  same resource; persistent history requires stable resource and thread IDs.

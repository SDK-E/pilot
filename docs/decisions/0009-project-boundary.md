# Project boundary

Status: first storage and organization slice implemented; shared context is
pending its runtime and file-storage contracts.

A Project is a Pilot-owned, creator-scoped collection of that creator's
conversations inside one WorkOS organization. The `projects` table stores the
name and optional instructions. `project_conversations` associates a Project
with a conversation using a composite key and cascading foreign keys.

Every project repository query includes the active organization and the
creator's WorkOS user ID. Adding a conversation independently verifies that
the conversation has the same organization and creator. This prevents a member
from using a project form to discover or attach another member's private chat.

Project instructions are stored configuration only. They are not injected into
an agent request, and membership in a Project does not change Mastra memory,
conversation access, file access, knowledge retrieval, or sharing. Those
behaviors need a protected Pilot-to-runtime project command and a storage
provider with explicit ownership, retrieval, deletion, and authorization rules.
Mastra observational memory also needs an explicitly authorized observer model;
Pilot must not add background model calls from the configured chat model by
assumption.

## Sources checked on 2026-09-08

- Installed `@mastra/memory` `1.28.2` documentation and types: memory scopes
  state by resource and thread; observational memory can create background
  observer generations.
- [Mastra memory overview](https://mastra.ai/docs/memory/overview): persistent
  history depends on a configured storage provider and stable scope IDs.

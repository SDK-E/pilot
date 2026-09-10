# Task approval workflow boundary

Status: implemented for the production public web-search and private scratchpad capabilities shared by
Conversational and Research personas. Generic task workflows and all other
protected actions remain pending.

Pilot owns organization-scoped goals, tasks, assignments, approvals, execution
records, authorization, and the user-facing activity trail. A model never
chooses whether an action is permitted. Pilot AI receives only a verified,
minimal command from Pilot after WorkOS membership and task/worker ownership
have been checked.

Public web-search and the private scratchpad use Mastra's built-in `requireToolApproval` suspension,
backed by the existing Turso storage provider. Pilot records a pending approval
from an OIDC-authenticated runtime callback and links it to the Pilot execution,
exact Mastra run ID, and tool-call ID. An authorized Pilot decision recreates
the selected request-scoped agent over that storage, verifies the suspended run
belongs to the owned conversation resource and allowlisted tool call, then
approves or declines it. Rejection prevents the tool from executing.

Pilot must reject stale, cross-organization, already-decided, or mismatched
workflow-run approvals before calling the runtime. Runtime endpoints continue
to require Vercel OIDC before parsing a command. The implemented action is public web search. Other tools, integrations, and
external side effects remain unavailable until their capability adapters and
approval rules are enforced.

## Implemented chat-task boundary

The `0009_sudden_siren` migration links a task to an optional Pilot
conversation. The chat rail creates a task only after its Server Action has
checked the current WorkOS membership and that the caller owns the selected
conversation and agent in the active organization. The repository repeats that
creator, organization, agent, and conversation check before a conversation task
is inserted, so a future caller cannot create a task by substituting an ID.

Conversation task and approval queries join through the owned conversation;
another organization member cannot use them to discover task or approval
metadata. The activity rail contains only the existing safe summaries from
Pilot-owned execution activity records. A pending Research web-search approval
has Approve and Decline controls for that chat's creator; it does not expose
tool payloads, outputs, URLs, errors, or reasoning.

## Sources checked on 2026-09-07

- [Mastra Suspend and Resume](https://mastra.ai/docs/workflows/suspend-and-resume)
  — workflow snapshots persist in the configured storage provider, and a run
  resumes at a specific suspended step with typed resume data.
- [Mastra Human-in-the-Loop](https://mastra.ai/docs/workflows/human-in-the-loop)
  — approval steps suspend with a user-facing payload; rejection can bail
  without executing later work.
- [Mastra AI SDK UI](https://mastra.ai/integrations/agentic-ui/ai-sdk-ui)
  — maintained handlers can stream workflow/agent events into AI SDK UI when
  the protected runtime transport is extended.

The legacy Tasks and Approvals pages use the same ownership boundary as the
chat rail. A task list includes only tasks created by the current user or tasks
attached to that user's conversations. An approval list joins through the owned
conversation. Organization membership alone never grants access to another
member's task or approval metadata.

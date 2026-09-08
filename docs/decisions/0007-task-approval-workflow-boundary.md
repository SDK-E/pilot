# Task approval workflow boundary

Status: partially implemented. Pilot now persists creator-scoped chat tasks and
renders the task, approval, and sanitized activity rail; the Mastra workflow,
approval decision, suspend/resume, and protected action remain pending.

Pilot owns organization-scoped goals, tasks, assignments, approvals, execution
records, authorization, and the user-facing activity trail. A model never
chooses whether an action is permitted. Pilot AI receives only a verified,
minimal command from Pilot after WorkOS membership and task/worker ownership
have been checked.

The first protected action will use a registered Mastra workflow backed by the
existing Turso storage provider. Its approval step suspends with safe context;
Pilot records a pending approval and links it to the Pilot execution and Mastra
workflow run. An authorized Pilot decision resumes that exact run with typed
resume data. Rejection stops the workflow without performing the protected
action. This makes approval and resume durable across requests and deployments
without adding a custom queue or workflow engine.

Pilot must reject stale, cross-organization, already-decided, or mismatched
workflow-run approvals before calling the runtime. Runtime endpoints continue
to require Vercel OIDC before parsing a command. The first action will be a
safe, deterministic result-producing action; tools, integrations, and external
side effects remain unavailable until their capability adapters and approval
rules are enforced.

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
Pilot-owned execution activity records. It does not expose tool payloads,
outputs, URLs, errors, reasoning, approval decisions, or an action control.

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

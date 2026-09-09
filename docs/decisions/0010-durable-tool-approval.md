# Durable tool approval boundary

Status: proposed; production remains fail-closed until implemented.

An `ask` rule must suspend the exact Mastra tool call before it can reach an
external service. Pilot stores an owner-scoped approval record containing only
the capability ID, a generated summary, and a verified runtime suspension
handle. It never stores tool input, output, URLs, prompts, errors, or secrets.

Only the creator of the conversation can approve or reject that record. Pilot
verifies the active WorkOS membership, conversation ownership, approval status,
and runtime handle before it forwards a one-time decision to Pilot AI. Pilot AI
verifies its existing OIDC transport before resuming the matching Mastra run.
An already decided, foreign, expired, or malformed approval is rejected.

`allow` may run the tool directly. Until this path is shipped, `ask`, `deny`,
and `auto-classifier` remain fail-closed.

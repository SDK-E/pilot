# Durable tool approval boundary

Status: implemented for Research public web search on 2026-09-09.

An `ask` rule must suspend the exact Mastra tool call before it can reach an
external service. Pilot stores an owner-scoped approval record containing only
a generated summary, the verified runtime run ID, and tool-call ID. The
capability is fixed by the callback schema to `web-search`. It never stores tool input, output, URLs, prompts, errors, or secrets.

Only the creator of the conversation can approve or reject that record. Pilot
verifies the active WorkOS membership, conversation ownership, approval status,
and runtime handle before it forwards a one-time decision to Pilot AI. Pilot AI
verifies its existing OIDC transport before resuming the matching Mastra run.
An already decided, foreign, expired, or malformed approval is rejected.

`allow` runs the tool directly. `ask` is enforced through persisted Mastra
tool-call approval. `deny` and `auto-classifier` remain fail-closed until their
own enforceable policy exists. A resume error cancels the claimed approval and
fails the execution rather than retrying an uncertain external operation.

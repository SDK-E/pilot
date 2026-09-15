# ADR-0016: Three agent kinds — Chat, Work, Code

Status: implemented on 2026-09-14. Supersedes the Conversational/Research
persona split in [0005](0005-agent-fleet-experience.md) and the
`/workspace` layout in [0008](0008-chat-workspace-interface.md). Retires
[0015](0015-action-proposals-and-effects.md), whose tables were never used.

## Decision

Pilot offers three kinds of agent, mirroring the product shape users already
know from ChatGPT (Chat, Work, Codex) and Claude (Chat, Cowork, Code):

| Kind   | Mode URL | Default agent | Tools it may use                 |
| ------ | -------- | ------------- | -------------------------------- |
| `chat` | `/chat`  | Pilot Chat    | web-search, scratchpad, ask-user |
| `work` | `/work`  | Pilot Work    | web-search, scratchpad, ask-user |
| `code` | `/code`  | Pilot Code    | web-search, scratchpad, ask-user |

Every configured agent is exactly one kind. The kind is fixed when the agent
is created because its conversations live under that mode. In Pilot AI, all
three derive from one base agent and differ only in their instructions, their
capability allowlist, and the step reminders they receive.

The research persona, its evidence pipeline, and the `auto-classifier`
approval mode are gone. The reusable pieces (web-search sanitizing, source
extraction, step reminders) moved into the base agent and apply to any kind
whose tool rules grant `web-search`.

## Consequences

- Routes: `/[mode]` is the start screen, `/[mode]/[conversationId]` an open
  conversation, plus `/projects`, `/agents`, and `/settings`. `/workspace`
  redirects to `/chat`.
- Storage: `workers.base_agent_id` holds `chat | work | code` (migration
  0027). Unused tables from earlier plans were dropped (migration 0028).
- Tool rules are `ask | allow | deny`. A tool runs only when its rule is
  `allow`, or `ask` and the user approved the durable suspension
  ([0010](0010-durable-tool-approval.md)).
- The organization's `webSearchEnabled` preference gates web search for every
  kind; there is no per-kind flag. It lives in `organization_preferences`
  (editable from Settings, owners/admins only), not an environment variable —
  pilot-ai separately still enforces its own `PILOT_ENABLE_WEB_SEARCH` env
  flag as a platform-level circuit breaker.

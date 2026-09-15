# Tool-call transparency: real command, output, and results

Status: implemented on 2026-09-15. Supersedes the no-raw-content clause of
[ADR-0006](0006-execution-activity-records.md) — see that document's own
pointer note.

## Decision

Pilot's activity trace now shows the real content of a tool call, not only a
fixed-vocabulary summary. A completed `code-sandbox` call shows the actual
command and its real stdout/stderr/exit code; a `web-search` call shows the
real query and linked results; `url-fetch`/`bulk-url-fetch` show the real
page title, URL, and content excerpt; `site-discovery`, `domain-intelligence`,
and `github-public` show their real structured results. This is a deliberate
product reversal, made explicitly by the product owner after comparing
Pilot's activity trace to Claude Code's transcript UI (which shows the real
command and output per step, individually expandable) and judging Pilot's
prior fully-sanitized trace as insufficiently transparent.

Tools with their own dedicated, always-visible UI elsewhere in the
conversation — `ask-user`'s inline question, `plan`'s Plan section,
`scratchpad`'s Working Notes section — do not get a second copy of their
content in the activity trace; showing it twice would be noise, not
transparency.

## Mechanism

Pilot AI captures each tool call's real `input`/`output` from Mastra's own
`beforeToolCall`/`afterToolCall` hook context (these already carry the full,
typed input and output for every call — nothing new had to be added on the
Mastra side) and formats it into one bounded (~4000 character) Markdown
string per capability (`src/mastra/activity/tool-detail.ts`). That string —
called `detail` — travels alongside the existing `toolId`/`state` on the
activity callback, is stored as a new nullable `detail` column on
`activity_events`, and is rendered in Pilot's UI through the same Streamdown
component already used for reply text, so fenced code blocks get syntax
highlighting and a copy button for free. A step carrying `detail` renders as
its own independently expandable row (`ActivityStepRow`), closed by default;
a step without one (a skill selection, an ask-user pause) renders exactly as
before.

`detail` is never captured for a failed call (nothing useful ran) and is
capped well below what any tool itself already truncates to (pilot-ai's own
per-tool output limits are 20,000–50,000 characters; `detail` is ~4,000) —
this is a display excerpt, not the tool's full result.

## Consequences

- Activity records are creator-scoped exactly like conversation messages and
  attachments already are — never exposed to another organization member.
  This reversal does not change that scope, only what a record may contain
  within it.
- No actual secrets flow through this: the code sandbox has no access to
  Pilot's own systems, secrets, or data (a fresh, isolated environment on
  every call — see the code-sandbox tool description), and web content is
  already public. There was never a credential in the data this ADR now
  allows through.
- Model reasoning is still never shown, not by policy but by construction —
  nothing in this pipeline captures reasoning tokens at all, from Pilot AI
  or Mastra. This ADR only concerns tool call input/output.
- `AGENTS.md`'s Security-rules section is updated to match. `docs/progress.md`
  predates several other changes from this same work session (the Tasks/
  Approvals removal, the WorkOS M2M migration) and is due a broader refresh
  rather than one more isolated edit here.

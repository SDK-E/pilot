# Plugins and Commands

Status: implemented on 2026-09-18.

## Decision

Skills, Commands, and Plugins now divide responsibility so they don't
re-converge into overlap:

- **Skill** (existing, unchanged) — extra instructions plus a tool-grant
  bundle, toggled per agent (`workers.enabledSkillIds`) and per message from
  the composer's skill picker.
- **Command** (new) — a single, named, reusable prompt template with no tool
  grant of its own. Slash-triggered from the composer: typing `/` on an
  empty draft opens a palette (`command-palette.tsx`, built on the vendored
  `cmdk`-based `Command` primitives) and picking one replaces the draft with
  the command's `promptTemplate`. `{placeholder}` tokens are inserted as-is
  for the member to fill in by hand — no interactive prompting was built for
  this, since a command author can just as easily word the template so the
  placeholder is obvious in place.
- **Plugin** (new) — a distribution unit that bundles existing Commands
  (`commandIds`, referencing `commands.id`) and/or tool grants (`toolIds`)
  into one thing granted to an agent the same way a Skill is
  (`workers.enabledPluginIds`, mirroring `enabledSkillIds` exactly —
  `src/plugins/agent-plugin-grants.ts` mirrors `agent-skill-grants.ts`).

## Why Commands have no visibility gate

The original plan sketched Commands as gated by which Plugins are granted to
an agent, the same way a Skill's tools are gated. In practice a Command
carries no tool grant and no instructions injected into the model — it is
purely a client-side prompt-template shortcut for the person typing, so
there is nothing about granting it that protects anything. Gating it would
only have added a second "is this available here" check with no security or
capability boundary behind it. Every command an organization authors is
available from every agent's `/` palette; `plugins.commandIds` documents
which commands a plugin bundles (shown in its own settings page) without
restricting where those commands are otherwise usable.

## Data model

`commands` and `plugins` are both plain org-scoped tables (`organizationId`,
`unique(organizationId, name)`), following `skills.ts` exactly — no
marketplace-install variant for either, since there is no Commands/Plugins
marketplace analogous to skills.sh; that column pair was deliberately left
off rather than added as unused, speculative schema.

Plugin tool grants are **standing**, not per-message: once a plugin is
granted to an agent, its tool ids are unioned into that agent's granted set
the same way `enabledToolIds` itself works (`MessageToolOverrides.
activePluginToolIds` in `tool-authorization.ts`), never toggled per message
the way a skill's tools can be. A plugin bundling GitHub + Slack tool access
is meant to behave like flipping on `enabledToolIds` entries, not like a
one-off per-message activation.

## Settings

`/commands` and `/plugins` (list, `/new`, `/[id]` edit) mirror `/skills`'
routes and components file-for-file. Any member can create/edit both — the
same trust level as Skills and Agents already have in this codebase, not
admin-gated like Connectors or platform-level model gateways.

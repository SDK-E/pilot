# AGENTS.md — Components

## Purpose

Shared and product UI, organized by area.

## Structure

- `agents/`, `conversations/`, `projects/`, `settings/`, `workspace/`,
  `brand/`, `theme/` — product-specific components, one folder per domain
  area, composed from `ui/` and `ai-elements/` primitives.
- `ui/` — vendored shadcn components (`components.json`, style
  `radix-mira`). **Never hand-edit.** See the `shadcn` skill
  (`.claude/skills/shadcn/SKILL.md`) for how to add/update a component.
- `ai-elements/` — vendored AI SDK UI components from the `@ai-elements`
  registry. **Never hand-edit.** See the `ai-elements` skill
  (`.claude/skills/ai-elements/SKILL.md`).

## Rules

- Both `ui/` and `ai-elements/` are lint-ignored (`knip.json`
  `ignoreIssues`, ESLint config) and excluded from the 300-line/60-line size
  limits in root AGENTS.md — that exemption does not extend to any other
  folder here.
- Need different behavior from a vendored component? Compose around it from
  a product-area folder, or regenerate it via its own CLI command — do not
  patch the vendored file in place.
- New product components go under `src/components/<area>/`, matching an
  existing domain in `src/<domain>/` where one exists.

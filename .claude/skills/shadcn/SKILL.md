---
name: shadcn
description: Use when adding, updating, or reasoning about components in src/components/ui, or when asked to add a new shadcn component to pilot.
---

# shadcn conventions (pilot)

`components.json`:

```json
{
  "style": "radix-mira",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "css": "src/app/globals.css",
    "baseColor": "zinc",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "remixicon",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- Style preset is `radix-mira` (not the default shadcn style) with `zinc` as base color, `remixicon` as the icon library, CSS variables for theming (tokens live in `src/app/globals.css`), and no class prefix.
- Add a new component with the shadcn CLI so it resolves the preset and aliases correctly: `pnpm dlx shadcn@latest add <component>`. It lands under `src/components/ui/` per the `ui` alias.

## Hard rule

`src/components/ui/**` is vendored and lint-ignored (see `knip.json` `ignoreIssues` and the ESLint config's ignore list) — **never hand-edit files there.** If a vendored component needs a behavior change:

1. Re-run the shadcn add/update command to regenerate it, or
2. Wrap/compose it from `src/components/<area>/` instead of patching the vendored file, or
3. If the upstream component itself must change, that's a decision for a maintainer, not a silent hand-edit.

Product-specific UI composition goes in `src/components/<area>/` (e.g. `src/components/conversations/`, `src/components/agents/`), never inside `ui/`.

See also the `ai-elements` skill for the sibling vendored directory `src/components/ai-elements/`.

---
name: ai-elements
description: Use when adding, updating, or reasoning about components in src/components/ai-elements, or when asked to add a new AI Elements (Vercel AI SDK UI) component to pilot.
---

# AI Elements conventions (pilot)

`components.json` registers the AI Elements registry:

```json
"registries": {
  "@ai-elements": "https://ai-sdk.dev/elements/api/registry/{name}.json"
}
```

- Add a new AI Elements component with the shadcn CLI against that registry, e.g. `pnpm dlx shadcn@latest add @ai-elements/<component>`. It lands under `src/components/ai-elements/` (the same `ui` aliasing conventions from `components.json` apply: RSC, TSX, no class prefix).
- These are the streaming-chat building blocks (message list, conversation, prompt input, sources, reasoning, etc.) built on the `ai` SDK (`@ai-sdk/react`, `ai` in `package.json`).

## Hard rule

`src/components/ai-elements/**` is vendored and lint-ignored (`knip.json` `ignoreIssues` covers `exports`/`types` for this path; ESLint also ignores it) — **never hand-edit files there.** To change behavior:

1. Re-run the registry add/update command to regenerate the component, or
2. Compose around it from `src/components/conversations/` or another product-area folder, or
3. If the upstream AI Elements component itself needs to change, treat that as an upstream/maintainer decision, not a local patch.

See also the `shadcn` skill for the sibling vendored directory `src/components/ui/`.

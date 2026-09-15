---
name: copywriting
description: Use when writing or editing user-facing product copy for Pilot — UI strings, onboarding text, empty states, error messages, marketing copy, or README/landing content.
---

# Copywriting for Pilot

Pilot is an AI workforce platform with three modes: **Chat** (ask/discuss), **Work** (hand off a task, agent plans and executes it), **Code** (read/explain/propose diffs). Ground every piece of copy in this model — don't invent a fourth mode or blur the three.

## Voice

- Match the existing default-agent instructions in `src/agents/agent-kinds.ts` — plain, concrete, second person ("you"), no hype adjectives ("revolutionary", "seamless", "powerful"). E.g. Chat's tagline: "Ask anything, think out loud, get a clear answer."; Work's: "Hand Pilot a task. It plans and works through it end to end."
- Never overclaim capability. Pilot is explicit that some things are unavailable (browser automation, external-write integrations, shared projects, semantic retrieval — see `README.md`/`docs/progress.md`). Copy should never imply a capability that isn't shipped; check `docs/progress.md` "Current state" before writing anything that claims a feature works.
- Tool descriptions (`src/agents/agent-tools.ts`) are the house style for describing a capability honestly and briefly — one sentence, concrete about what happens and what boundary it respects (e.g. "Run shell commands and scripts in a fresh, isolated sandbox with no access to Pilot's own systems or data").

## Practical rules

- UI microcopy (buttons, empty states, placeholders) stays short — see the `placeholder` and `suggestions` fields per kind in `agent-kinds.ts` for length/tone targets.
- Error messages should say what happened and, where possible, what to do next — not just "Something went wrong."
- Don't write copy implying background work is durable/guaranteed unless it is (AGENTS.md: "A green build is not evidence of successful authentication or durable execution" — the same caution applies to promising users a result).

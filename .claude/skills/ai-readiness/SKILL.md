---
name: ai-readiness
description: Use when evaluating or improving how well Pilot's own codebase and docs work with AI coding agents (Claude Code, Codex, etc.) working on this repo — AGENTS.md coverage, agent-facing scripts, and machine-readable project structure.
---

# Keeping pilot AI-agent-ready

This is about agents working _on_ the pilot repo (Claude Code, Codex, etc.), distinct from `ai-seo` (agents/search engines discovering Pilot the _product_ externally).

## AGENTS.md coverage

- Root `AGENTS.md` (via `CLAUDE.md`'s `@AGENTS.md` import) is the top-level contract. Subdirectories with their own conventions get their own short `AGENTS.md` that links back to root rather than repeating it — see `src/AGENTS.md`, `src/ai/AGENTS.md`, `docs/AGENTS.md`, `tests/AGENTS.md` for the existing pattern (Purpose / Key paths or files / Rules).
- When adding a new domain directory under `src/<domain>/` with conventions an agent wouldn't infer from reading one file (e.g. a required check order, a security invariant, a vendored/do-not-edit boundary), add an `AGENTS.md` there rather than relying on the root file to cover it by inference.
- Keep every `AGENTS.md` short (15-40 lines is the working target in this repo) and accurate — a stale one is worse than none, since an agent trusts it over its own reading of the code.

## Machine-checkable structure

- `pnpm check` (lint + typecheck + format + knip) is the single command an agent should run to know static correctness — keep it comprehensive rather than adding more ad hoc scripts agents have to know to run separately.
- `.claude/settings.json`'s permission allowlist should track real `package.json` scripts, not aspirational ones — an agent trusts the allowlist as "these are the safe, real commands."
- Don't let `docs/progress.md` "Current state" drift from what's actually implemented and verified — it's the single source an agent should trust over exploring the whole codebase cold (per `docs/AGENTS.md`).

## Skills

- Prefer a repo `.claude/skills/<name>/SKILL.md` over a long paragraph in `AGENTS.md` when the guidance is narrow, procedural, and only needed for a specific kind of task (deploying, adding a shadcn component, auth changes) — that keeps `AGENTS.md` itself short while still making the knowledge discoverable and triggerable.

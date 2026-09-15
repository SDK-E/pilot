# Chat/Work/Code baseline roadmap

Tracking doc for the "normal chat baseline features" gap list from the
2026-09-14 planning session, kept up to date as items ship. Not an ADR — no
architecture decision is final until the corresponding item is implemented
and its own ADR (if warranted) is written.

## Why this exists

Pilot Chat will be compared directly to ChatGPT/Claude by anyone who opens
it. A handful of table-stakes features are missing today; their absence
reads as "broken," not "different." This doc is the checklist for closing
that gap, in the priority order the product owner set.

## Status legend

`[ ]` not started · `[~]` in progress · `[x]` shipped and verified

## 1. Pilot Chat baseline (do first — this is what gets compared to ChatGPT/Claude)

- [x] **Message edit + regenerate** — edit a sent user message and re-run
      from that point; regenerate the last assistant response. Shipped
      2026-09-15 ([ADR-0019](decisions/0019-message-edit-and-regenerate.md)).
- [x] **Real stop-and-resume** — stopping a run should allow resuming it,
      not just mark the execution `failed`. Shipped 2026-09-15
      ([ADR-0020](decisions/0020-stop-and-resume.md)).
- [ ] **Image input (vision)** — attachments currently store images but
      never send them to the model; text/PDF/DOCX only today.
- [ ] **Image generation** — not available in any mode.
- [ ] **Per-conversation model picker** — model choice is currently an org
      setting, not a per-chat dropdown.
- [ ] **User-level custom instructions** — only persona-level instructions
      exist today, no per-user override.
- [ ] **Full-text search across chat history** — only conversation title
      search exists today.
- [ ] **Share/export-as-link** — only Markdown/PDF export of your own chat
      exists today; no shareable link.
- [ ] **Voice input/output** — not available.

## 2. Pilot Work

- [ ] Not scoped yet. The old approval-workflow/`ActionProposal`/
      `EffectIntent` substrate this was originally meant to extend is gone
      (removed deliberately — migration 0028 dropped those tables). Work
      mode needs its own design from here, not a resurrection of that infra.

## 3. Pilot Code

- [ ] Not scoped yet. Same note as above — don't assume the removed
      approvals/durable-execution ledger as a foundation; design fresh.

## Log

- 2026-09-15: Doc created from yesterday's plan; also published as a
  shareable Artifact tracker. No items started yet.
- 2026-09-15: Corrected — dropped references to the old Tasks/Approvals
  substrate (ActionProposal/EffectIntent/durable execution) as something to
  preserve or build on. That infra was intentionally removed; Work and Code
  scopes are undecided, not "extend the old approval workflow."
- 2026-09-15: Shipped message edit + regenerate across both repos
  (pilot-ai: `/v1/conversations/truncate`; pilot: stream route modes, DB
  truncation, UI). Verified: `pnpm check`, `pnpm build`, `pnpm test`,
  `pnpm test:server`, `pnpm test:db` clean in both repos. See ADR-0019.
- 2026-09-15: Shipped real stop-and-resume (pilot-ai: forwards the request's
  abort signal into `agent.stream()`; pilot: keeps the partial reply on
  stop, marks it `isPartial`, and a "continue" stream mode resumes and
  appends onto it). Verified: `pnpm check`, `pnpm build`, `pnpm test`,
  `pnpm test:server`, `pnpm test:db` clean in both repos. See ADR-0020.

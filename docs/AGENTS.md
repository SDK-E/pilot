# AGENTS.md — Documentation

## Purpose

`pilot/docs/` contains project documentation including progress tracking, architecture decisions, and platform reports.

## Key paths

- `docs/progress.md` — Implementation status (updated on each verified slice)
- `docs/decisions/` — Architecture Decision Records (ADR-0001 through ADR-0014)
- `docs/pilot-platform/` — Platform reports and ADR index
  - `reports/01-baseline.md` — Baseline verification report
  - `reports/01-contradictions.md` — Contradiction matrix
  - `reports/01-result.md` — Result report (SHA, files, AC status)
  - `adr-index.md` — ADR index
  - `implementation/01-baseline-contracts.md` — Plan 01 implementation plan

## Rules

- ADR status transitions: proposed → accepted → implemented → superseded
- Progress entries: distinguish "implémenté" (file:symbol) from "vérifié" (dated result)
- Never claim production deployment from a green build alone

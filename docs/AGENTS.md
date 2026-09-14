# AGENTS.md — Documentation

## Purpose

`pilot/docs/` holds the implementation record, architecture decisions, and
older platform reports.

## Key paths

- `docs/progress.md` — Implementation status. The "Current state" section at
  the top is the source of truth; entries below it are history.
- `docs/decisions/` — Architecture Decision Records. Start with
  [0016](decisions/0016-three-agent-kinds.md) for today's product model.
- `docs/pilot-platform/` — Reports and plans from earlier phases. Read them as
  history; where they conflict with an ADR, the ADR wins.

## Rules

- ADR status transitions: proposed → accepted → implemented → superseded.
- Progress entries distinguish "implemented" (file and symbol) from
  "verified" (dated result of a real run).
- Never claim a production deployment from a green build alone.

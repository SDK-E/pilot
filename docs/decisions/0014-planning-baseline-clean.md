# ADR 0014 — Planning baseline clean

Status: proposed.

## Context

`pilot-ai/tsconfig.json` has an uncommitted modification: `baseUrl` removed, paths changed from relative `src/*` to absolute `/src/*`. This blocks reproducible `pnpm typecheck`.

## Decision

Commit the modified `tsconfig.json` as-is. The absolute `/src/*` paths are required by Mastra's module resolution. No historical config restoration.

## Resolution

The modified `tsconfig.json` has been committed (SHA: a1bdb2c54ddee6c791fc330c159401ea089feaa5). No uncommitted `tsconfig.json` changes remain in the baseline.

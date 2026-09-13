# Pilot runtime contract

Status: implemented for web-search/scratchpad/ask-user; fail-closed for the rest.

## Context

Previously proposed as partially implemented with Turso storage and authenticated service transport pending verification. The baseline at SHAs d70ca8cd5588e39dd766b9e953b89472d81073cd (pilot) and a1bdb2c54ddee6c791fc330c159401ea089feaa5 (pilot-ai) confirms the runtime is operational.

## Verified implementation

See ADR 0012 (runtime verified state) for the complete baseline.

## Key changes from proposed to implemented

- **Runtime**: Turso/LibSQL (not Neon as originally proposed in the handoff) — verified in `pilot-runtime.ts` (LibSQLStore + TURSO_*) and route `/v1/chat/completions`
- **Chats**: Executable (not "non exécutables" as KILOCODE_HANDOFF.md:41-42 suggested) — SUPERSEDED
- **Tools**: web-search, scratchpad, ask-user implemented with toolApprovalMode (allow/ask); fail-closed for langsearch, browser, file-analysis, github
- **Storage**: Mastra memory on Turso (not @mastra/pg with Neon as originally proposed) — per installed `@mastra/libsql` `1.22.3` types and runtime configuration

## Research evidence and model selection (2026-09-13)

Pilot may pass a Kilo Gateway model ID matching the `kilo/...` namespace through the authenticated runtime command. Pilot resolves that ID only from organization-owned policy; it never trusts a browser field or persona value at stream time. The runtime contract continues to reject other provider namespaces and retains the fixed production tool allowlist.

The product never accepts textual pseudo-tool markup as evidence of a tool invocation. Only the OIDC-authenticated runtime callbacks may create activity events. User-visible source evidence is stored separately from activity records and remains scoped to the conversation owner.

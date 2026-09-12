# ADR 0012 — Runtime verified state

Status: implemented.

## Context

The checked-out `pilot` and `pilot-ai` repos at their baseline SHAs implement a verified runtime state. This ADR records the verified state so that plan 02 has a portable, repo-local handoff.

## Verified state

- **pilot** (d70ca8cd5588e39dd766b9e953b89472d81073cd): Next 16.3.4 / React 19.2.8 / AI SDK ^7.0.93 / Drizzle 0.45.2 / Neon. Auth via WorkOS AuthKit + Node SDK. Domain logic, ACL, product state, executions/activity.
- **pilot-ai** (52169139f43aaf32eb0a4291fe14871de6dc6087 base, tsconfig.json committed per ADR 0014): Mastra 1.27.3 (core 1.64.0) / libsql ^1.22.3 / Turso. Runtime implementation with BaseAgent/memory/tools/workflows.

## Runtime surface (pilot-ai src/conversation/api/index.ts)

- POST /v1/chat/completions (chat-completions.ts — OIDC, OpenAI-compatible)
- POST /v1/approvals/resume (approval-resume-route.ts → approval-resume.ts)
- POST /v1/conversations/delete (conversation-delete.ts → cleanup-handlers.ts)
- POST /v1/projects/delete-memory (project-delete.ts → cleanup-handlers.ts)
- POST /pilot/conversations/generate (generate.ts — inherited)

## Transport Pilot→runtime

OIDC in `x-pilot-runtime-oidc-token` + `x-vercel-trusted-oidc-idp-token`; context in headers `x-pilot-[organization-id/worker-id/conversation-id/execution-id/base-agent-id/allowed-tool-ids/tool-approval-mode/project-*]`; body = OpenAI chat-completion. Runtime reconstructs `GenerateConversationReply` via `createConversationCommandFromChatCompletion`.

## Boundary invariants

- WorkOS = auth humaine dans pilot (AuthKit + Node SDK; pas getSignInUrl/cookie en Server Component; sign-out POST Server Action)
- Pilot = domaine métier + ACL + état produit + exécutions/activités
- pilot-ai = implémentation Mastra (BaseAgent/memory/tools/workflows) — aucun import de domaine Pilot dans pilot-ai/src/runtime
- OIDC Vercel (`@vercel/oidc`) authentifie Pilot→runtime, vérifié JWKS dans `pilot-ai/src/runtime/auth/vercel-oidc.ts` (issuer/audience/subject exacts)
- Neon = données métier Pilot; Turso (LibSQL) = mémoire/suspensions Mastra; Blob privé = fichiers/artefacts
- shadcn/ui ^4.21.0 + AI Elements (@ai-sdk/react 4.0.96)
- Un chat privé reste privé : scope `organizationId + createdByWorkosUserId` partout

## Chats exécutables

Contrairement à ce que suggère `KILOCODE_HANDOFF.md:41-42`, les chats sont exécutables et le runtime utilise Turso/LibSQL (ADR 0004 SUPERSÉDÉE pour cette affirmation).

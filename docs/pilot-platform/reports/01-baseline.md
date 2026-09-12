# 01 — Baseline contract verification report

Generated: 2026-09-11.

## Baseline SHAs

| Repo               | SHA                                      | Branch | State                                        |
| ------------------ | ---------------------------------------- | ------ | -------------------------------------------- |
| pilot              | d70ca8cd5588e39dd766b9e953b89472d81073cd | main   | clean                                        |
| pilot-ai           | a1bdb2c54ddee6c791fc330c159401ea089feaa5 | main   | clean (tsconfig.json committed per ADR 0014) |
| pilot-ui           | ABSENT from workspace                    | —      | —                                            |
| pilot-integrations | ABSENT from workspace                    | —      | —                                            |

## Migrations (Drizzle journal)

0000–0019, all committed and applied to dev/preview/prod Neon. No historical migration modified. Hashes preserved.

Schema `src/db/schema.ts` reflects 0000–0019 including conversation_attachments (0016), conversation_scratchpads (0017), user_question_options (0018), project_files (0019).

## Runtime surface (pilot-ai src/conversation/api/index.ts)

- POST /v1/chat/completions (chat-completions.ts — OIDC, OpenAI-compatible)
- POST /v1/approvals/resume (approval-resume-route.ts → approval-resume.ts)
- POST /v1/conversations/delete (conversation-delete.ts → cleanup-handlers.ts)
- POST /v1/projects/delete-memory (project-delete.ts → cleanup-handlers.ts)
- POST /pilot/conversations/generate (generate.ts — inherited)

Transport Pilot→runtime: OIDC in x-pilot-runtime-oidc-token + x-vercel-trusted-oidc-idp-token; context in headers x-pilot-[organization-id/worker-id/conversation-id/execution-id/base-agent-id/allowed-tool-ids/tool-approval-mode/project-*]; body = OpenAI chat-completion. Runtime reconstructs GenerateConversationReply via createConversationCommandFromChatCompletion.

## Env catalog (zero secrets)

**pilot/.env.example**: WORKOS_API_KEY, WORKOS_CLIENT_ID, WORKOS_COOKIE_PASSWORD, NEXT_PUBLIC_WORKOS_REDIRECT_URI, PILOT_AI_RUNTIME_URL, PILOT_RESEARCH_ENABLED.

**pilot-ai/.env.example**: KILO_API_KEY, PILOT_MASTRA_DATABASE_URL, TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, PILOT_ENABLE_DEVELOPMENT_RESEARCH, PILOT_ENABLE_RESEARCH, PILOT_ACTIVITY_CALLBACK_URL, MASTRA_DATABASE_URL/_EDITOR/_MEMORY (dev research), LANGSEARCH_API_KEY, BROWSERBASE_API_KEY, VERCEL_OIDC_TOKEN, MASTRA_PLATFORM_ACCESS_TOKEN, MASTRA_PROJECT_ID, PILOT_PROFILE, PILOT_MAIN_MAX_STEPS, PILOT_SUBAGENT_MAX_STEPS, PILOT_MAIN_TOKEN_LIMIT, PILOT_SUBAGENT_TOKEN_LIMIT, PILOT_OBSERVATIONAL_MEMORY, PILOT_OBSERVATION_MESSAGE_TOKENS, PILOT_SEARCH_CACHE_TTL_MS, PILOT_FETCH_CACHE_TTL_MS, PILOT_EVAL_MODE, PILOT_EVAL_CONCURRENCY, PILOT_EVAL_TIMEOUT_MS, PILOT_EVAL_MAX_RETRIES.

## Scripts / CI

**pilot** pnpm.json: check=lint+typecheck+format:check+knip; build (migration prod via vercel.json if VERCEL_ENV=production); test (playwright); test:server (tsx --test); test:db (dev Neon, deletes fixtures); audit --audit-level high. CI quality.yml: check, build, playwright, audit; env test-only, **no real Neon** (test:db absent from CI).

**pilot-ai** package.json: typecheck (tsc --noEmit); build (mastra build); test (vitest); knip --production; audit. CI quality.yml: build, typecheck, test, knip, audit.

## Existing tests

**pilot/tests**: auth-boundary.spec.ts, worker-repository.integration.test.ts, research-availability.test.ts, persona-instructions.test.ts, attachment-text-extraction.test.ts, duplicate-persona-name.test.ts, research-tool-authorization.test.ts, message-submit-shortcut.test.ts; plus server-tests/pilot-ai-stream.test.ts, src/ai/pilot-runtime-oidc.test.ts.

**pilot-ai/src/**/**/\*.test.ts**: pilot-conversation.test.ts, openai.vercel.test.ts, cleanup.vercel.test.ts, security-public-url.test.ts, vercel-oidc.test.ts, base-agent.test.ts, tools/url-fetch.test.ts, evals/{pilot-subagents/pilot-browser/pilot-tools}.eval.test.ts.

## Cataloguer (pilot/src/agents/agent-configuration.ts)

2 bases (conversational, research); 3 production tools (web-search, scratchpad, ask-user); 4 reserved tools (langsearch, browser, file-analysis, github) with availableFor:[]. Dev allowlisted model: kilo/kilo-auto/free.

## Blocked items (credentials required)

- pilot test:db (Neon dev), test playwright (WorkOS hosted); test:server (pilot-ai-stream.test.ts may require OIDC runtime + LLM).
- pilot-ai evals (eval*, verify:memory, pilot-browser.eval.test.ts) require TURSO_*, LANGSEARCH_API_KEY, BROWSERBASE_API_KEY, KILO_API_KEY.

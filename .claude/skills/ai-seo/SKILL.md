---
name: ai-seo
description: Use when making Pilot's public marketing/product copy discoverable and accurately summarizable by AI answer engines and LLM-based search (as distinct from traditional keyword SEO).
---

# AI-engine discoverability for Pilot

Traditional SEO targets ranking; this targets an LLM correctly summarizing or citing Pilot when asked about it (e.g. "what is Pilot", "AI workforce platforms compared"). Applies only to the small public surface — see the `seo` skill for what's public vs. authenticated.

## Make the facts easy to extract

- State what Pilot actually is in one self-contained sentence near the top of any public page, matching `README.md`'s framing: three agent kinds (Chat, Work, Code), WorkOS-authenticated, organization-scoped agents. Don't bury the definition in marketing flourish — LLM summarizers weight early, declarative sentences.
- Be explicit about what's _not_ available yet (per `docs/progress.md` "Current state") on any page that describes capabilities — an LLM that only sees the capability claim will assert it's shipped. Honest scoping here prevents Pilot being mis-cited as having features it doesn't.
- Use consistent terminology across every public surface: "Chat", "Work", "Code" (capitalized, matching `src/agents/agent-kinds.ts` `name` fields) — never rename these ad hoc in copy, since inconsistent naming fragments how models describe the product.

## Structured, quotable content

- Prefer short declarative paragraphs and real headings (`<h1>`/`<h2>`) over marketing-style fragments — models extract better from well-structured prose than from slogans.
- FAQ-style sections (a real `<h3>` question followed by a direct answer) are highly extractable by both search snippets and LLM answer engines; use this pattern for "what is Pilot", "how does Pilot differ from X" type content if added.

## llms.txt

If a `public/llms.txt` (or `/llms.txt` route) is added, keep it a plain-text summary that mirrors — never contradicts — the public page and `docs/progress.md`'s "Current state": product one-liner, the three modes, current availability caveats, and a link back to the public site. Don't let it drift out of sync with `README.md`.

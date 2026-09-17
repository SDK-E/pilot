/**
 * Structural content for the public Docs and Blog sections. Deliberately
 * small: each entry is real product information, not filler written to hit
 * a page count. New entries should only be added when there's something
 * real to say.
 */
export interface ContentSection {
  heading: string;
  paragraphs: readonly string[];
  list?: readonly string[];
}

export interface ContentPage {
  slug: string;
  title: string;
  summary: string;
  sections: readonly ContentSection[];
}

export const DOCS_PAGES: readonly ContentPage[] = [
  {
    slug: "getting-started",
    title: "Getting started with Pilot",
    summary:
      "Sign in, pick a mode, and start a conversation. Here's how the workspace is organized.",
    sections: [
      {
        heading: "Sign in",
        paragraphs: [
          "Pilot uses WorkOS for authentication. Sign in from the home page, and Pilot creates your organization's default agents the first time you use each mode.",
        ],
      },
      {
        heading: "Pick a mode",
        paragraphs: [
          "Every conversation happens inside one of three modes, each with its own default agent:",
        ],
        list: [
          "Chat — ask anything, think out loud, get a clear answer.",
          "Work — hand Pilot a task; it plans and works through it end to end.",
          "Code — read, explain, and propose code changes as reviewable diffs.",
        ],
      },
      {
        heading: "Your data stays yours",
        paragraphs: [
          "Conversations, projects, and files are private to the person who created them within your organization. Being a member of the same organization does not grant access to another member's conversations.",
        ],
      },
    ],
  },
  {
    slug: "modes-and-tools",
    title: "Modes and tools",
    summary:
      "What Chat, Work, and Code can each do, and the tools an agent may use along the way.",
    sections: [
      {
        heading: "Three modes, one agent model",
        paragraphs: [
          "Chat, Work, and Code are modes of the same underlying agent, differing in instructions and which tools they're allowed to use — not three separate products.",
        ],
      },
      {
        heading: "Tools an agent can use",
        paragraphs: [
          "When a tool is enabled and allowed for the mode, it simply runs as part of the conversation — there's no separate approval step to click through.",
        ],
        list: [
          "Web search — search and read public web pages through Pilot's protected runtime.",
          "Scratchpad — private working notes for one conversation, never shared between chats.",
          "Ask you — Pilot pauses to ask a focused question when the answer would change the result.",
          "Plan — a visible, step-by-step task list kept up to date as Pilot works.",
          "Code sandbox — runs shell commands and scripts in a fresh, isolated sandbox with no access to Pilot's own systems or data.",
        ],
      },
    ],
  },
];

export const BLOG_POSTS: readonly (ContentPage & { publishedLabel: string })[] =
  [
    {
      slug: "pilot-early-access",
      title: "Pilot is in early access",
      publishedLabel: "Early access",
      summary:
        "What Chat, Work, and Code each do, and what early access means for pricing.",
      sections: [
        {
          heading: "Three modes, one agent model",
          paragraphs: [
            "Chat, Work, and Code are modes of the same underlying agent, differing in instructions and which tools they're allowed to use — not three separate products. Chat answers questions, Work plans and runs multi-step tasks, and Code reads, explains, and proposes changes as reviewable diffs.",
          ],
        },
        {
          heading: "Pricing during early access",
          paragraphs: [
            "Pilot's plans are Free (Chat), 5€/month (adds Work), and 20€/month (Chat, Work, and Code). Billing isn't live yet, so every plan is free to use right now — you can see what each tier will include on the Pricing page, and we'll tell you before any charge ever applies.",
          ],
        },
      ],
    },
    {
      slug: "how-pilot-plans-before-it-acts",
      title: "How Pilot plans before it acts",
      publishedLabel: "Product",
      summary:
        "In Work and Code mode, Pilot lays out its steps before running any of them — and every tool call is logged with what actually happened.",
      sections: [
        {
          heading: "A visible plan, not a black box",
          paragraphs: [
            "For anything beyond a one-shot question, Pilot's plan tool keeps a step-by-step task list that updates as it works. You see the plan before a single step runs, not just a finished answer at the end.",
          ],
        },
        {
          heading: "Every tool call is logged, not summarized",
          paragraphs: [
            "When Pilot uses a tool — a web search, a connected app, a code sandbox run — the activity record holds what it actually did: the real command, output, and result, bounded and server-formatted. Pilot never reports a result for a call it didn't make.",
          ],
        },
        {
          heading: "Code changes come back as diffs",
          paragraphs: [
            "Code mode runs in a fresh, isolated sandbox with no access to Pilot's own systems, secrets, or data, and the result is a small, reviewable diff — something you check, not something you're asked to trust.",
          ],
        },
      ],
    },
    {
      slug: "bring-your-own-model",
      title: "Bring your own model to Pilot",
      publishedLabel: "Product",
      summary:
        "Pilot isn't tied to one model provider. A platform admin can point it at Kilo, Vercel AI Gateway, or any OpenAI-compatible endpoint.",
      sections: [
        {
          heading: "Model choice is an admin setting, not a hardcoded default",
          paragraphs: [
            "From the admin panel, a platform admin can add any OpenAI-compatible model gateway — Kilo, Vercel AI Gateway, or a custom endpoint — with its own API key and an allow-list of models. Organizations then choose from whatever the admin has made available.",
          ],
        },
        {
          heading: "Why this matters",
          paragraphs: [
            "Pricing, latency, and model quality all shift over time. Pointing Pilot at a different gateway is a settings change, not a redeploy — and nothing about a gateway's identity is hardcoded into the product.",
          ],
        },
      ],
    },
  ];

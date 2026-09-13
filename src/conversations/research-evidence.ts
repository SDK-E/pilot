import "server-only";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationSources, conversations } from "@/db/schema";

export type ResearchSource = {
  title: string;
  domain: string;
  url: string;
  summary: string;
};

function safeSource(raw: string): ResearchSource | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return {
      title: url.hostname,
      domain: url.hostname,
      url: url.toString(),
      summary: "Source cited by Pilot.",
    };
  } catch {
    return undefined;
  }
}

/** Removes model-emitted execution syntax; real tool activity is server generated. */
export function sanitizeResearchText(value: string): {
  text: string;
  invalidToolSyntax: boolean;
  sources: ResearchSource[];
} {
  const invalidToolSyntax =
    /(?:<\/?tool_call\b|\b(?:webSearch|fetch_url|tool_call)\s*>)/i.test(value);
  const text = value
    .replace(/<\/?tool_call\b[^>]*>/gi, "")
    .replace(/^\s*(?:webSearch|fetch_url|tool_call)\s*>.*$/gim, "")
    .trim();
  const sources = [...new Set(text.match(/https?:\/\/[^\s)\]]+/g) ?? [])]
    .map(safeSource)
    .filter((source): source is ResearchSource => Boolean(source))
    .slice(0, 8);
  return { text, invalidToolSyntax, sources };
}

export async function saveResearchSources(input: {
  organizationId: string;
  conversationId: string;
  messageId: string;
  userId: string;
  sources: ResearchSource[];
}) {
  if (!input.sources.length) return;
  await db.insert(conversationSources).values(
    input.sources.map((source) => ({
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      createdByWorkosUserId: input.userId,
      ...source,
    })),
  );
}

export async function listMessageSources(input: {
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  return db
    .select({
      messageId: conversationSources.messageId,
      title: conversationSources.title,
      domain: conversationSources.domain,
      url: conversationSources.url,
      summary: conversationSources.summary,
    })
    .from(conversationSources)
    .innerJoin(
      conversations,
      eq(conversationSources.conversationId, conversations.id),
    )
    .where(
      and(
        eq(conversationSources.organizationId, input.organizationId),
        eq(conversationSources.conversationId, input.conversationId),
        eq(conversationSources.createdByWorkosUserId, input.userId),
        eq(conversations.createdByWorkosUserId, input.userId),
      ),
    )
    .orderBy(asc(conversationSources.createdAt));
}

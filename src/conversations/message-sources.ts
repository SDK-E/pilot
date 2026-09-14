import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { conversationSources, conversations } from "@/db/schema";

export interface MessageSource {
  title: string;
  domain: string;
  url: string;
  summary: string;
}

const MAX_SOURCES_PER_MESSAGE = 8;
const PSEUDO_TOOL_SYNTAX =
  /(?:<\/?tool_call\b|\b(?:webSearch|fetch_url|tool_call)\s*>)/i;

function sourceFromUrl(raw: string): MessageSource | undefined {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    return {
      title: url.hostname,
      domain: url.hostname,
      url: url.href,
      summary: "Source cited by Pilot.",
    };
  } catch {
    return undefined;
  }
}

/**
 * Cleans a web-enabled response before it is shown or stored: strips
 * model-emitted pseudo tool syntax (real tool activity is server generated)
 * and lists the public URLs it cited.
 */
export function sanitizeWebResponse(value: string): {
  text: string;
  hasInvalidToolSyntax: boolean;
  sources: MessageSource[];
} {
  const hasInvalidToolSyntax = PSEUDO_TOOL_SYNTAX.test(value);
  const text = value
    .replaceAll(/<\/?tool_call\b[^>]*>/gi, "")
    .replaceAll(/^[ \t]*(?:webSearch|fetch_url|tool_call)[ \t]*>.*$/gim, "")
    .trim();
  const sources = [...new Set(text.match(/https?:\/\/[^\s)\]]+/g))]
    .map((url) => sourceFromUrl(url))
    .filter((source): source is MessageSource => source !== undefined)
    .slice(0, MAX_SOURCES_PER_MESSAGE);
  return { text, hasInvalidToolSyntax, sources };
}

export async function saveMessageSources(input: {
  organizationId: string;
  conversationId: string;
  messageId: string;
  userId: string;
  sources: MessageSource[];
}) {
  if (input.sources.length === 0) return;
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

export function listMessageSources(input: {
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

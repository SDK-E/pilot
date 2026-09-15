import { z } from "zod";

import { AdapterError, capList, fetchJson, truncate } from "./adapter-shared";

const searchMessagesSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(25).default(10),
});

const readMessageSchema = z.object({
  messageId: z.string().trim().min(1).max(200),
});

function headers(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

function stripHtml(html: string): string {
  return html
    .replaceAll(/<style\b[^>]*>.*?<\/style>/gis, "")
    .replaceAll(/<script\b[^>]*>.*?<\/script>/gis, "")
    // eslint-disable-next-line sonarjs/super-linear-regex -- bounded, non-nested character class; no backtracking risk in practice
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();
}

interface GmailHeader {
  name: string;
  value: string;
}

interface GmailPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
  headers?: GmailHeader[];
}

// eslint-disable-next-line sonarjs/todo-tag -- intentional, tracked flag for an unverified API detail, not a stray note
// TODO(connectors): verify against Gmail API's current message-part shape
// before enabling in production — MIME part traversal for the body can be
// deeper than a single level for multipart/alternative or /mixed messages.
function extractBody(payload: GmailPart | undefined): string {
  if (!payload) return "";
  if (payload.body?.data) {
    const decoded = Buffer.from(payload.body.data, "base64url").toString("utf8");
    return payload.mimeType === "text/html" ? stripHtml(decoded) : decoded;
  }
  const parts = payload.parts ?? [];
  for (const child of parts) {
    const text = extractBody(child);
    if (text) return text;
  }
  return "";
}

function headerValue(headerList: GmailHeader[] | undefined, name: string): string | null {
  return (
    headerList?.find((header) => header.name.toLowerCase() === name.toLowerCase())
      ?.value ?? null
  );
}

async function searchMessages(accessToken: string, params: Record<string, unknown>) {
  const parsed = searchMessagesSchema.parse(params);
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", parsed.query);
  url.searchParams.set("maxResults", String(parsed.limit));
  const data = (await fetchJson(url.href, { headers: headers(accessToken) })) as {
    messages?: { id: string }[];
  };
  return { messages: capList(data.messages ?? [], parsed.limit) };
}

async function readMessage(accessToken: string, params: Record<string, unknown>) {
  const parsed = readMessageSchema.parse(params);
  const data = (await fetchJson(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${parsed.messageId}?format=full`,
    { headers: headers(accessToken) },
  )) as { id: string; snippet?: string; payload?: GmailPart };
  const payload = data.payload;
  const bodyText = extractBody(payload);
  const fallback = bodyText.length > 0 ? bodyText : (data.snippet ?? "");
  return {
    id: data.id,
    subject: headerValue(payload?.headers, "Subject"),
    from: headerValue(payload?.headers, "From"),
    snippet: data.snippet ?? null,
    body: truncate(fallback),
  };
}

export async function runGmailAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "search-messages") {
    return searchMessages(input.accessToken, input.params);
  }
  if (input.action === "read-message") {
    return readMessage(input.accessToken, input.params);
  }
  throw new AdapterError(`Unknown Gmail action "${input.action}".`);
}

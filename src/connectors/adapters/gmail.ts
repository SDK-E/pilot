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
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// TODO(connectors): verify against Gmail API's current message-part shape
// before enabling in production — MIME part traversal for the body can be
// deeper than a single level for multipart/alternative or /mixed messages.
function extractBody(payload: unknown): string {
  const part = payload as {
    mimeType?: string;
    body?: { data?: string };
    parts?: unknown[];
  } | null;
  if (!part) return "";
  if (part.body?.data) {
    const decoded = Buffer.from(part.body.data, "base64url").toString("utf8");
    return part.mimeType === "text/html" ? stripHtml(decoded) : decoded;
  }
  for (const child of part.parts ?? []) {
    const text = extractBody(child);
    if (text) return text;
  }
  return "";
}

interface GmailHeader {
  name: string;
  value: string;
}

function headerValue(headerList: GmailHeader[] | undefined, name: string): string | null {
  return headerList?.find((header) => header.name.toLowerCase() === name.toLowerCase())
    ?.value ?? null;
}

export async function runGmailAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "search-messages") {
    const params = searchMessagesSchema.parse(input.params);
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", params.query);
    url.searchParams.set("maxResults", String(params.limit));
    const data = (await fetchJson(url.toString(), {
      headers: headers(input.accessToken),
    })) as { messages?: { id: string }[] };
    return { messages: capList(data.messages ?? [], params.limit) };
  }
  if (input.action === "read-message") {
    const params = readMessageSchema.parse(input.params);
    const data = (await fetchJson(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${params.messageId}?format=full`,
      { headers: headers(input.accessToken) },
    )) as { id: string; snippet?: string; payload?: unknown };
    const payload = data.payload as { headers?: GmailHeader[] } | undefined;
    return {
      id: data.id,
      subject: headerValue(payload?.headers, "Subject"),
      from: headerValue(payload?.headers, "From"),
      snippet: data.snippet ?? null,
      body: truncate(extractBody(data.payload) || data.snippet || ""),
    };
  }
  throw new AdapterError(`Unknown Gmail action "${input.action}".`);
}

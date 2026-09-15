import { z } from "zod";

import { AdapterError, capList, fetchJson, truncate } from "./adapter-shared";

const searchPagesSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(25).default(10),
});

const readPageSchema = z.object({
  pageId: z.string().trim().min(1).max(200),
});

function headers(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    "notion-version": "2022-06-28",
    "content-type": "application/json",
  };
}

interface NotionPage {
  id: string;
  url?: string;
  properties?: Record<string, { title?: { plain_text?: string }[] }>;
}

function pageTitle(page: NotionPage): string {
  const titleProperty = Object.values(page.properties ?? {}).find(
    (property) => Array.isArray(property.title),
  );
  return titleProperty?.title?.map((piece) => piece.plain_text ?? "").join("") ?? "Untitled";
}

interface NotionBlock {
  type: string;
  [key: string]: unknown;
}

// eslint-disable-next-line sonarjs/todo-tag -- intentional, tracked flag for an unverified API detail, not a stray note
// TODO(connectors): verify against Notion's current block schema before
// enabling in production — this only flattens the common rich_text-bearing
// block types, not every block type Notion supports.
function blockText(block: NotionBlock): string {
  const body = block[block.type] as { rich_text?: { plain_text?: string }[] } | undefined;
  return body?.rich_text?.map((piece) => piece.plain_text ?? "").join("") ?? "";
}

export async function runNotionAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "search-pages") {
    const params = searchPagesSchema.parse(input.params);
    const data = (await fetchJson("https://api.notion.com/v1/search", {
      method: "POST",
      headers: headers(input.accessToken),
      body: JSON.stringify({
        query: params.query,
        page_size: params.limit,
        filter: { property: "object", value: "page" },
      }),
    })) as { results?: NotionPage[] };
    return {
      pages: capList(
        (data.results ?? []).map((page) => ({
          id: page.id,
          title: pageTitle(page),
          url: page.url ?? null,
        })),
        params.limit,
      ),
    };
  }
  if (input.action === "read-page") {
    const params = readPageSchema.parse(input.params);
    const data = (await fetchJson(
      `https://api.notion.com/v1/blocks/${params.pageId}/children?page_size=100`,
      { headers: headers(input.accessToken) },
    )) as { results?: NotionBlock[] };
    const text = (data.results ?? [])
      .map((block) => blockText(block))
      .filter(Boolean)
      .join("\n");
    if (!text) throw new AdapterError("This Notion page has no readable text.");
    return { id: params.pageId, content: truncate(text) };
  }
  throw new AdapterError(`Unknown Notion action "${input.action}".`);
}

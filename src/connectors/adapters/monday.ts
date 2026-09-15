import { z } from "zod";

import { AdapterError, capList, fetchJson } from "./adapter-shared";

const listBoardsSchema = z.object({
  limit: z.number().int().min(1).max(25).default(10),
});

const queryItemsSchema = z.object({
  boardId: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(25).default(10),
});

function headers(accessToken: string) {
  return { authorization: accessToken, "content-type": "application/json" };
}

async function graphql(accessToken: string, query: string): Promise<unknown> {
  const data = (await fetchJson("https://api.monday.com/v2", {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify({ query }),
  })) as { data?: unknown; errors?: unknown[] };
  if (data.errors?.length) {
    throw new AdapterError("Monday.com returned an error for this query.");
  }
  return data.data;
}

interface MondayBoard {
  id: string;
  name: string;
}

interface MondayItem {
  id: string;
  name: string;
}

// eslint-disable-next-line sonarjs/todo-tag -- intentional, tracked flag for an unverified API detail, not a stray note
// TODO(connectors): verify against Monday.com's current GraphQL schema
// before enabling in production.
export async function runMondayAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "list-boards") {
    const params = listBoardsSchema.parse(input.params);
    const data = (await graphql(
      input.accessToken,
      `query { boards(limit: ${params.limit}) { id name } }`,
    )) as { boards?: MondayBoard[] };
    return { boards: capList(data.boards ?? [], params.limit) };
  }
  if (input.action === "query-items") {
    const params = queryItemsSchema.parse(input.params);
    const data = (await graphql(
      input.accessToken,
      `query { boards(ids: [${JSON.stringify(params.boardId)}]) { items_page(limit: ${params.limit}) { items { id name } } } }`,
    )) as { boards?: { items_page?: { items?: MondayItem[] } }[] };
    const items = data.boards?.[0]?.items_page?.items ?? [];
    return { items: capList(items, params.limit) };
  }
  throw new AdapterError(`Unknown Monday action "${input.action}".`);
}

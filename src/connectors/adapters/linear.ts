import { z } from "zod";

import { AdapterError, capList, fetchJson, truncate } from "./adapter-shared";

const searchIssuesSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(25).default(10),
});

function headers(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    "content-type": "application/json",
  };
}

interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  url: string;
  description?: string | null;
  state?: { name?: string };
}

export async function runLinearAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "search-issues") {
    const params = searchIssuesSchema.parse(input.params);
    const data = (await fetchJson("https://api.linear.app/graphql", {
      method: "POST",
      headers: headers(input.accessToken),
      body: JSON.stringify({
        query: `query($term: String!, $first: Int!) {
          issueSearch(term: $term, first: $first) {
            nodes { id identifier title url description state { name } }
          }
        }`,
        variables: { term: params.query, first: params.limit },
      }),
    })) as { data?: { issueSearch?: { nodes?: LinearIssue[] } } };
    const nodes = data.data?.issueSearch?.nodes ?? [];
    return {
      issues: capList(
        nodes.map((issue) => ({
          id: issue.identifier,
          title: issue.title,
          url: issue.url,
          state: issue.state?.name ?? null,
          description: issue.description ? truncate(issue.description) : null,
        })),
        params.limit,
      ),
    };
  }
  throw new AdapterError(`Unknown Linear action "${input.action}".`);
}

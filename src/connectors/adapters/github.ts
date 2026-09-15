import { z } from "zod";

import { AdapterError, capList, fetchJson, truncate } from "./adapter-shared";

const searchIssuesSchema = z.object({
  query: z.string().trim().min(1).max(500),
  limit: z.number().int().min(1).max(25).default(10),
});

const listRepositoryIssuesSchema = z.object({
  owner: z.string().trim().min(1).max(100),
  repo: z.string().trim().min(1).max(100),
  state: z.enum(["open", "closed", "all"]).default("open"),
  limit: z.number().int().min(1).max(25).default(10),
});

interface GithubIssue {
  number: number;
  title: string;
  state: string;
  html_url: string;
  body?: string | null;
  user?: { login?: string };
  repository_url?: string;
}

function shapeIssue(issue: GithubIssue) {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    author: issue.user?.login ?? null,
    body: issue.body ? truncate(issue.body) : null,
  };
}

function headers(accessToken: string) {
  return {
    authorization: `Bearer ${accessToken}`,
    accept: "application/vnd.github+json",
  };
}

export async function runGithubAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "search-issues") {
    const params = searchIssuesSchema.parse(input.params);
    const url = new URL("https://api.github.com/search/issues");
    url.searchParams.set("q", params.query);
    url.searchParams.set("per_page", String(params.limit));
    const data = (await fetchJson(url.href, {
      headers: headers(input.accessToken),
    })) as { items?: GithubIssue[] };
    return {
      issues: capList((data.items ?? []).map((issue) => shapeIssue(issue)), params.limit),
    };
  }
  if (input.action === "list-repository-issues") {
    const params = listRepositoryIssuesSchema.parse(input.params);
    const url = new URL(
      `https://api.github.com/repos/${params.owner}/${params.repo}/issues`,
    );
    url.searchParams.set("state", params.state);
    url.searchParams.set("per_page", String(params.limit));
    const data = (await fetchJson(url.href, {
      headers: headers(input.accessToken),
    })) as GithubIssue[];
    return { issues: capList(data.map((issue) => shapeIssue(issue)), params.limit) };
  }
  throw new AdapterError(`Unknown GitHub action "${input.action}".`);
}

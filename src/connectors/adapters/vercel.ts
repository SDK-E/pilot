import { z } from "zod";

import { AdapterError, capList, fetchJson } from "./adapter-shared";

const listDeploymentsSchema = z.object({
  projectId: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});

const projectStatusSchema = z.object({
  projectId: z.string().trim().min(1).max(200),
});

function headers(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

interface VercelDeployment {
  uid: string;
  url: string;
  state?: string;
  createdAt?: number;
}

// eslint-disable-next-line sonarjs/todo-tag -- intentional, tracked flag for an unverified API detail, not a stray note
// TODO(connectors): verify against Vercel's current REST API response
// shape before enabling in production.
export async function runVercelAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "list-deployments") {
    const params = listDeploymentsSchema.parse(input.params);
    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("limit", String(params.limit));
    if (params.projectId) url.searchParams.set("projectId", params.projectId);
    const data = (await fetchJson(url.href, {
      headers: headers(input.accessToken),
    })) as { deployments?: VercelDeployment[] };
    return {
      deployments: capList(
        (data.deployments ?? []).map((deployment) => ({
          id: deployment.uid,
          url: deployment.url,
          state: deployment.state ?? null,
          createdAt: deployment.createdAt
            ? new Date(deployment.createdAt).toISOString()
            : null,
        })),
        params.limit,
      ),
    };
  }
  if (input.action === "project-status") {
    const params = projectStatusSchema.parse(input.params);
    const data = (await fetchJson(
      `https://api.vercel.com/v9/projects/${params.projectId}`,
      { headers: headers(input.accessToken) },
    )) as { id: string; name: string; latestDeployments?: VercelDeployment[] };
    return {
      id: data.id,
      name: data.name,
      latestDeployment: data.latestDeployments?.[0]
        ? {
            id: data.latestDeployments[0].uid,
            url: data.latestDeployments[0].url,
            state: data.latestDeployments[0].state ?? null,
          }
        : null,
    };
  }
  throw new AdapterError(`Unknown Vercel action "${input.action}".`);
}

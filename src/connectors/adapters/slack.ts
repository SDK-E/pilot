import { z } from "zod";

import { AdapterError, capList, fetchJson, truncate } from "./adapter-shared";

const listChannelsSchema = z.object({
  limit: z.number().int().min(1).max(25).default(10),
});

const readRecentMessagesSchema = z.object({
  channelId: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(25).default(10),
});

function headers(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

// eslint-disable-next-line sonarjs/todo-tag -- intentional, tracked flag for an unverified API detail, not a stray note
// TODO(connectors): verify against Slack's current Web API response shape
// before enabling in production.
export async function runSlackAction(input: {
  accessToken: string;
  action: string;
  params: Record<string, unknown>;
}): Promise<unknown> {
  if (input.action === "list-channels") {
    const params = listChannelsSchema.parse(input.params);
    const url = new URL("https://slack.com/api/conversations.list");
    url.searchParams.set("limit", String(params.limit));
    const data = (await fetchJson(url.href, {
      headers: headers(input.accessToken),
    })) as { ok?: boolean; channels?: { id: string; name: string }[] };
    if (!data.ok) throw new AdapterError("Slack could not list channels.");
    return {
      channels: capList(
        (data.channels ?? []).map((channel) => ({
          id: channel.id,
          name: channel.name,
        })),
        params.limit,
      ),
    };
  }
  if (input.action === "read-recent-messages") {
    const params = readRecentMessagesSchema.parse(input.params);
    const url = new URL("https://slack.com/api/conversations.history");
    url.searchParams.set("channel", params.channelId);
    url.searchParams.set("limit", String(params.limit));
    const data = (await fetchJson(url.href, {
      headers: headers(input.accessToken),
    })) as {
      ok?: boolean;
      messages?: { user?: string; text?: string; ts?: string }[];
    };
    if (!data.ok) throw new AdapterError("Slack could not read this channel.");
    return {
      messages: capList(
        (data.messages ?? []).map((message) => ({
          user: message.user ?? null,
          text: message.text ? truncate(message.text) : "",
          ts: message.ts ?? null,
        })),
        params.limit,
      ),
    };
  }
  throw new AdapterError(`Unknown Slack action "${input.action}".`);
}

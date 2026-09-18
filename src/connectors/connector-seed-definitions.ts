/**
 * Quick-fill presets for the platform admin's "Add provider" form
 * (`/admin/connector-providers`) — GitHub, Slack, Notion, Linear, Vercel,
 * and Monday.com, expressed as plain data for the generic connector engine
 * (`base-connector.ts` / `base-connector-adapter.ts`). Picking one fills
 * every field except client id/secret, which the admin still supplies; the
 * admin can also ignore every preset and configure a totally custom
 * provider. See docs/decisions/0023-dynamic-connectors.md.
 */
import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

export interface ConnectorSeed {
  slug: string;
  displayName: string;
  icon: string;
  description: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  scopeDelimiter: string;
  accountIdentifierUrl: string | null;
  accountIdentifierField: string | null;
  actions: ConnectorDefinitionAction[];
}

export const CONNECTOR_SEEDS: ConnectorSeed[] = [
  {
    slug: "github",
    displayName: "GitHub",
    icon: "🐙",
    description: "Search and read issues, pull requests, and repositories.",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo"],
    scopeDelimiter: " ",
    accountIdentifierUrl: "https://api.github.com/user",
    accountIdentifierField: "login",
    actions: [
      {
        id: "search-issues",
        label: "Search issues",
        description: "Search issues and pull requests by keyword.",
        method: "GET",
        urlTemplate:
          "https://api.github.com/search/issues?q={query}&per_page={limit}",
        listPath: "items",
        idField: "number",
        titleField: "title",
        urlField: "html_url",
      },
    ],
  },
  {
    slug: "slack",
    displayName: "Slack",
    icon: "💬",
    description: "List channels and read recent messages.",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "channels:history", "chat:write"],
    scopeDelimiter: ",",
    accountIdentifierUrl: "https://slack.com/api/team.info",
    accountIdentifierField: "team.name",
    actions: [
      {
        id: "list-channels",
        label: "List channels",
        description: "List the workspace's channels.",
        method: "GET",
        urlTemplate:
          "https://slack.com/api/conversations.list?limit={limit}&exclude_archived=true",
        listPath: "channels",
        idField: "id",
        titleField: "name",
      },
      {
        id: "post-message",
        label: "Post message",
        description: "Post a message to a channel.",
        method: "POST",
        urlTemplate: "https://slack.com/api/chat.postMessage",
        bodyTemplate: '{"channel":"{channel}","text":"{text}"}',
        idField: "ts",
        isMutating: true,
      },
    ],
  },
  {
    slug: "notion",
    displayName: "Notion",
    icon: "📝",
    description: "Search pages in the workspace.",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    scopeDelimiter: " ",
    accountIdentifierUrl: null,
    accountIdentifierField: null,
    actions: [
      {
        id: "search-pages",
        label: "Search pages",
        description: "Search pages by keyword.",
        method: "POST",
        urlTemplate: "https://api.notion.com/v1/search",
        bodyTemplate: '{"query":"{query}","page_size":{limit}}',
        listPath: "results",
        idField: "id",
        urlField: "url",
      },
    ],
  },
  {
    slug: "linear",
    displayName: "Linear",
    icon: "📐",
    description: "Search issues in the workspace.",
    authorizeUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes: ["read"],
    scopeDelimiter: ",",
    accountIdentifierUrl: null,
    accountIdentifierField: null,
    actions: [
      {
        id: "search-issues",
        label: "Search issues",
        description: "Search issues by keyword.",
        method: "GET",
        urlTemplate: "https://api.linear.app/graphql?q={query}",
        listPath: "issues",
        idField: "identifier",
        titleField: "title",
        urlField: "url",
      },
    ],
  },
  {
    slug: "vercel",
    displayName: "Vercel",
    icon: "▲",
    description: "List deployments and check project status.",
    authorizeUrl: "https://vercel.com/integrations/pilot/new",
    tokenUrl: "https://api.vercel.com/v2/oauth/access_token",
    scopes: [],
    scopeDelimiter: " ",
    accountIdentifierUrl: "https://api.vercel.com/v2/user",
    accountIdentifierField: "user.username",
    actions: [
      {
        id: "list-deployments",
        label: "List deployments",
        description: "List recent deployments.",
        method: "GET",
        urlTemplate: "https://api.vercel.com/v6/deployments?limit={limit}",
        listPath: "deployments",
        idField: "uid",
        urlField: "url",
      },
    ],
  },
  {
    slug: "monday",
    displayName: "Monday.com",
    icon: "🗓️",
    description: "List boards and query items.",
    authorizeUrl: "https://auth.monday.com/oauth2/authorize",
    tokenUrl: "https://auth.monday.com/oauth2/token",
    scopes: ["boards:read"],
    scopeDelimiter: " ",
    accountIdentifierUrl: null,
    accountIdentifierField: null,
    actions: [
      {
        id: "list-boards",
        label: "List boards",
        description: "List the account's boards.",
        method: "GET",
        urlTemplate:
          "https://api.monday.com/v2?query=query{boards(limit:{limit}){id name}}",
        listPath: "data.boards",
        idField: "id",
        titleField: "name",
      },
    ],
  },
];

/**
 * The connector provider registry: one plain-fetch OAuth2 implementation per
 * provider (`src/connectors/providers/*`), all shaped to the same
 * `ConnectorProvider` contract from `connector-provider-types.ts`. See
 * docs/decisions/0019-connectors.md for the product shape (personal vs.
 * organization connections, single default per scope, read-only for now).
 */
import { githubProvider } from "@/connectors/providers/github";
import { googleProvider } from "@/connectors/providers/google";
import { linearProvider } from "@/connectors/providers/linear";
import { mondayProvider } from "@/connectors/providers/monday";
import { notionProvider } from "@/connectors/providers/notion";
import { slackProvider } from "@/connectors/providers/slack";
import { vercelProvider } from "@/connectors/providers/vercel";

import type {
  ConnectorProvider,
  ConnectorProviderId,
} from "@/connectors/connector-provider-types";

export const CONNECTOR_PROVIDERS: Record<ConnectorProviderId, ConnectorProvider> = {
  github: githubProvider,
  google: googleProvider,
  slack: slackProvider,
  notion: notionProvider,
  linear: linearProvider,
  vercel: vercelProvider,
  monday: mondayProvider,
};

export function connectorProvider(id: ConnectorProviderId): ConnectorProvider {
  return CONNECTOR_PROVIDERS[id];
}

export {
  CONNECTOR_PROVIDER_IDS,
  CONNECTOR_TOOL_IDS,
  isConnectorProviderId,
  isConnectorToolId,
  TOOL_ID_PROVIDER,
} from "@/connectors/connector-provider-types";

export type {
  ConnectorProvider,
  ConnectorProviderId,
  ConnectorToolId,
  ProviderTokenResult,
} from "@/connectors/connector-provider-types";

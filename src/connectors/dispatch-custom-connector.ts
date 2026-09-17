import "server-only";

import { runConnectorDefinitionAction } from "@/connectors/adapters/base-connector-adapter";
import { refreshDefinitionToken } from "@/connectors/base-connector";
import {
  listConnectorDefinitions,
  markConnectorDefinitionError,
  resolveConnectorDefinitionConnection,
  saveConnectorDefinitionConnection,
  touchConnectorDefinitionLastUsed,
} from "@/connectors/connector-definition-repository";
import {
  connectorErrorResponse,
  extractHttpStatus,
  REFRESH_MARGIN_MS,
} from "@/connectors/runtime-dispatch-shared";

async function ensureFreshDefinitionAccessToken(
  connection: NonNullable<
    Awaited<ReturnType<typeof resolveConnectorDefinitionConnection>>
  >,
): Promise<string | null> {
  const expiresSoon =
    connection.tokenExpiresAt &&
    connection.tokenExpiresAt.getTime() - Date.now() < REFRESH_MARGIN_MS;
  if (!expiresSoon || !connection.refreshToken) return connection.accessToken;

  try {
    const refreshed = await refreshDefinitionToken(
      connection,
      connection.refreshToken,
    );
    await saveConnectorDefinitionConnection({
      organizationId: connection.organizationId,
      id: connection.connectorDefinitionId,
      accountIdentifier: connection.accountIdentifier ?? "",
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken ?? connection.refreshToken,
      tokenExpiresAt: refreshed.expiresAt,
      grantedScopes: refreshed.grantedScopes,
    });
    return refreshed.accessToken;
  } catch (error) {
    const status = extractHttpStatus(error);
    const message =
      status === 401 || status === 403
        ? "Reauthorization required — reconnect this connector."
        : "Token refresh failed; will retry on the next call.";
    // eslint-disable-next-line no-console -- only path to surface this server-side; no secrets logged
    console.error("Custom connector token refresh failed:", error);
    await markConnectorDefinitionError({
      id: connection.connectorDefinitionId,
      message,
    });
    return null;
  }
}

async function listConnectors(organizationId: string): Promise<Response> {
  const definitions = await listConnectorDefinitions(organizationId);
  return Response.json({
    result: {
      connectors: definitions
        .filter(
          (definition) =>
            definition.definitionStatus === "active" &&
            definition.connectionStatus === "active",
        )
        .map((definition) => ({
          slug: definition.slug,
          displayName: definition.displayName,
          icon: definition.icon,
          description: definition.description,
          actions: definition.actions.map((action) => ({
            id: action.id,
            label: action.label,
            description: action.description,
            isMutating: action.isMutating ?? false,
          })),
        })),
    },
  });
}

async function callConnectorAction(input: {
  organizationId: string;
  connectorSlug: string;
  action: string;
  params: Record<string, unknown>;
  confirm: boolean;
}): Promise<Response> {
  const connection = await resolveConnectorDefinitionConnection({
    organizationId: input.organizationId,
    slug: input.connectorSlug,
  });
  if (!connection) {
    return Response.json(
      {
        error: "No connected custom connector with that slug.",
        kind: "not-found",
      },
      { status: 404 },
    );
  }
  const accessToken = await ensureFreshDefinitionAccessToken(connection);
  if (!accessToken) {
    return Response.json(
      { error: "Connection needs to be reconnected.", kind: "auth-required" },
      { status: 401 },
    );
  }
  try {
    const result = await runConnectorDefinitionAction({
      accessToken,
      actions: connection.actions,
      action: input.action,
      params: input.params,
      confirmed: input.confirm,
    });
    await touchConnectorDefinitionLastUsed(connection.connectorDefinitionId);
    return Response.json({ result });
  } catch (error) {
    return connectorErrorResponse(
      error,
      `Custom connector action failed for ${input.connectorSlug}/${input.action}:`,
    );
  }
}

/**
 * Dispatches `connector` — one agent-facing tool shared by every connector.
 * `list-connectors` is a meta-action needing no connection; every other
 * action targets one connector by `connectorSlug`.
 */
export async function dispatchCustomConnector(input: {
  organizationId: string;
  action: string;
  params: Record<string, unknown>;
  connectorSlug: string | undefined;
  confirm?: boolean;
}): Promise<Response> {
  if (input.action === "list-connectors")
    return listConnectors(input.organizationId);

  if (!input.connectorSlug) {
    return Response.json(
      {
        error: "connectorSlug is required for this action.",
        kind: "invalid-input",
      },
      { status: 400 },
    );
  }
  return callConnectorAction({
    organizationId: input.organizationId,
    connectorSlug: input.connectorSlug,
    action: input.action,
    params: input.params,
    confirm: input.confirm ?? false,
  });
}

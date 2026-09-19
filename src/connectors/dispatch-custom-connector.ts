import "server-only";

import { runConnectorDefinitionAction } from "@/connectors/adapters/base-connector-adapter";
import { refreshDefinitionToken } from "@/connectors/base-connector";
import {
  listConnectorDefinitions,
  markConnectorConnectionError,
  resolveConnectorConnection,
  saveConnectorConnection,
  touchConnectorConnectionLastUsed,
} from "@/connectors/connector-definition-repository";
import {
  connectorErrorResponse,
  extractHttpStatus,
  REFRESH_MARGIN_MS,
} from "@/connectors/runtime-dispatch-shared";

async function ensureFreshDefinitionAccessToken(
  connection: NonNullable<
    Awaited<ReturnType<typeof resolveConnectorConnection>>
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
    await saveConnectorConnection({
      organizationId: connection.organizationId,
      connectorDefinitionId: connection.connectorDefinitionId,
      scope: connection.scope,
      ownerWorkosUserId: connection.ownerWorkosUserId,
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
    await markConnectorConnectionError({
      connectionId: connection.connectionId,
      message,
    });
    return null;
  }
}

/**
 * `requestedSlugs` is the composer's per-message connector picker: `null`
 * means every connector this org has defined is eligible for listing (the
 * per-user, per-connector connection check below still applies); a set
 * narrows the list to just those slugs for this turn.
 */
async function listConnectors(
  organizationId: string,
  actingUserId: string,
  requestedSlugs: readonly string[] | null,
): Promise<Response> {
  const allDefinitions = await listConnectorDefinitions(organizationId);
  const definitions = allDefinitions.filter(
    (definition) =>
      definition.definitionStatus === "active" &&
      (requestedSlugs === null || requestedSlugs.includes(definition.slug)),
  );
  const connected = await Promise.all(
    definitions.map(async (definition) => {
      const connection = await resolveConnectorConnection({
        organizationId,
        slug: definition.slug,
        actingUserId,
      });
      return connection ? definition : null;
    }),
  );
  return Response.json({
    result: {
      connectors: connected
        .filter((definition) => definition !== null)
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
  actingUserId: string;
  connectorSlug: string;
  action: string;
  params: Record<string, unknown>;
  confirm: boolean;
  requestedSlugs: readonly string[] | null;
}): Promise<Response> {
  if (
    input.requestedSlugs !== null &&
    !input.requestedSlugs.includes(input.connectorSlug)
  ) {
    return Response.json(
      {
        error: "This connector wasn't enabled for this message.",
        kind: "not-found",
      },
      { status: 404 },
    );
  }
  const connection = await resolveConnectorConnection({
    organizationId: input.organizationId,
    slug: input.connectorSlug,
    actingUserId: input.actingUserId,
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
    await touchConnectorConnectionLastUsed(connection.connectionId);
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
 * action targets one connector by `connectorSlug`. `requestedSlugs` is this
 * turn's per-message connector-slug restriction (see
 * `executions.requestedConnectorSlugs`), `null` meaning no restriction.
 */
export async function dispatchCustomConnector(input: {
  organizationId: string;
  actingUserId: string;
  action: string;
  params: Record<string, unknown>;
  connectorSlug: string | undefined;
  confirm?: boolean;
  requestedSlugs: readonly string[] | null;
}): Promise<Response> {
  if (input.action === "list-connectors")
    return listConnectors(
      input.organizationId,
      input.actingUserId,
      input.requestedSlugs,
    );

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
    actingUserId: input.actingUserId,
    connectorSlug: input.connectorSlug,
    action: input.action,
    params: input.params,
    confirm: input.confirm ?? false,
    requestedSlugs: input.requestedSlugs,
  });
}

import "server-only";

import {
  ConnectorError,
  httpStatusForConnectorErrorKind,
} from "@/connectors/connector-error";

export const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Turns a caught adapter/action error into the runtime callback's response
 * envelope: a `ConnectorError` maps to its own status/kind, anything else is
 * an opaque, truthful "unknown" failure — never a fabricated success.
 */
export function connectorErrorResponse(
  error: unknown,
  context: string,
): Response {
  // eslint-disable-next-line no-console -- only path to surface this server-side; no secrets logged
  console.error(context, error);
  if (error instanceof ConnectorError) {
    return Response.json(
      { error: error.message, kind: error.kind },
      { status: httpStatusForConnectorErrorKind(error.kind) },
    );
  }
  return Response.json(
    { error: "This connector action could not be completed.", kind: "unknown" },
    { status: 502 },
  );
}

/**
Best-effort extraction of an HTTP status a thrown fetch-adjacent error mentions.
*/
export function extractHttpStatus(error: unknown): number | undefined {
  const message = error instanceof Error ? error.message : "";
  const match = /\b(4\d{2}|5\d{2})\b/.exec(message);
  return match ? Number(match[1]) : undefined;
}

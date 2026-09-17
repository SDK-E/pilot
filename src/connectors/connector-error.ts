/**
 * Structured connector failures. Every adapter and the execute route throw
 * and catch this instead of a bare `Error`, so a caller can distinguish
 * "fix your input" from "reconnect" from "try again later" instead of one
 * generic failure string (spec: connector errors must be structured and
 * truthful, never collapsed into a single undifferentiated failure).
 */
export type ConnectorErrorKind =
  | "invalid-input"
  | "auth-required"
  | "authorization-denied"
  | "not-found"
  | "conflict"
  | "rate-limited"
  | "unavailable"
  | "unknown";

export class ConnectorError extends Error {
  readonly kind: ConnectorErrorKind;

  constructor(kind: ConnectorErrorKind, message: string) {
    super(message);
    this.name = "ConnectorError";
    this.kind = kind;
  }
}

export function connectorErrorKindForStatus(
  status: number,
): ConnectorErrorKind {
  if (status === 401) return "auth-required";
  if (status === 403) return "authorization-denied";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 429) return "rate-limited";
  if (status >= 500) return "unavailable";
  if (status >= 400) return "invalid-input";
  return "unknown";
}

/**
HTTP status the runtime callback should answer with for a given kind.
*/
export function httpStatusForConnectorErrorKind(
  kind: ConnectorErrorKind,
): number {
  switch (kind) {
    case "invalid-input": {
      return 400;
    }
    case "auth-required": {
      return 401;
    }
    case "authorization-denied": {
      return 403;
    }
    case "not-found": {
      return 404;
    }
    case "conflict": {
      return 409;
    }
    case "rate-limited": {
      return 429;
    }
    default: {
      return 502;
    }
  }
}

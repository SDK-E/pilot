/**
 * Executes one admin-defined action (`ConnectorDefinitionAction`) against
 * whatever REST API the definition describes — the generic counterpart to
 * the 7 hand-written provider adapters in this directory. A definition's
 * `actions` array is the only thing that varies per custom connector; this
 * file is the same for all of them.
 */
import { readDotPath } from "../base-connector";
import {
  ConnectorError,
  connectorErrorKindForStatus,
} from "../connector-error";

import { capList, truncate } from "./adapter-shared";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

const MAX_LIST_ITEMS = 25;

function substitute(template: string, params: Record<string, unknown>): string {
  return template.replaceAll(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    return value === undefined || value === null
      ? match
      : encodeURIComponent(scalarToString(value));
  });
}

/**
 * Renders a scalar for interpolation; objects/arrays fall back to JSON.
 */
function scalarToString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function fieldValue(
  record: Record<string, unknown>,
  ...keys: (string | undefined)[]
): string | null {
  for (const key of keys) {
    if (key && record[key] !== undefined) return scalarToString(record[key]);
  }
  return null;
}

function shapeItem(
  item: unknown,
  action: ConnectorDefinitionAction,
): Record<string, unknown> {
  if (!item || typeof item !== "object") return { value: item };
  const record = item as Record<string, unknown>;
  return {
    id: fieldValue(record, action.idField ?? "id"),
    title: fieldValue(
      record,
      action.titleField,
      action.titleField ? undefined : "title",
      "name",
    ),
    url: fieldValue(record, action.urlField ?? "url"),
    raw: truncate(JSON.stringify(record), 2000),
  };
}

async function fetchActionResponse(
  action: ConnectorDefinitionAction,
  accessToken: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const url = substitute(action.urlTemplate, params);
  const headers: Record<string, string> = {
    authorization: `Bearer ${accessToken}`,
  };
  if (action.method === "POST") headers["content-type"] = "application/json";
  const response = await fetch(url, {
    method: action.method,
    headers,
    body:
      action.method === "POST" && action.bodyTemplate
        ? substitute(action.bodyTemplate, params)
        : undefined,
  });
  if (!response.ok) {
    throw new ConnectorError(
      connectorErrorKindForStatus(response.status),
      `This connector's "${action.id}" action failed (${response.status}).`,
    );
  }
  return response.json();
}

function shapeListResult(
  data: unknown,
  action: ConnectorDefinitionAction,
): unknown {
  const rawList = action.listPath
    ? readDotPath(data, action.listPath)
    : undefined;
  const items = Array.isArray(rawList) ? rawList : [];
  const nextCursor = action.nextCursorPath
    ? readDotPath(data, action.nextCursorPath)
    : undefined;
  return {
    items: capList(
      items.map((item) => shapeItem(item, action)),
      MAX_LIST_ITEMS,
    ),
    nextCursor: typeof nextCursor === "string" ? nextCursor : undefined,
  };
}

/**
 * A mutating action never runs on its first call — it returns this instead,
 * so an agent must surface the pending action (e.g. via `ask-user`) and
 * call again with `confirm: true` before anything actually happens. This is
 * the whole confirmation mechanism: no durable approval record, no second
 * system — the model holding an unconfirmed result is the only state.
 */
function confirmationRequiredResult(action: ConnectorDefinitionAction) {
  return {
    confirmationRequired: true as const,
    action: {
      id: action.id,
      label: action.label,
      description: action.description,
    },
  };
}

export async function runConnectorDefinitionAction(input: {
  accessToken: string;
  actions: ConnectorDefinitionAction[];
  action: string;
  params: Record<string, unknown>;
  confirmed?: boolean;
}): Promise<unknown> {
  const action = input.actions.find(
    (candidate) => candidate.id === input.action,
  );
  if (!action) {
    throw new ConnectorError(
      "invalid-input",
      `This connector has no "${input.action}" action.`,
    );
  }
  if (action.isMutating && !input.confirmed) {
    return confirmationRequiredResult(action);
  }

  const data = await fetchActionResponse(
    action,
    input.accessToken,
    input.params,
  );

  if (!action.listPath) {
    return typeof data === "object" && data !== null
      ? { item: shapeItem(data, action) }
      : { item: null };
  }
  return shapeListResult(data, action);
}

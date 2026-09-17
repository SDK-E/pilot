import assert from "node:assert/strict";
import { test } from "node:test";

import { runConnectorDefinitionAction } from "@/connectors/adapters/base-connector-adapter";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

const readAction: ConnectorDefinitionAction = {
  id: "search",
  label: "Search",
  description: "Search records.",
  method: "GET",
  urlTemplate: "https://api.example.com/search?q={query}",
  listPath: "items",
};

const mutatingAction: ConnectorDefinitionAction = {
  id: "post-message",
  label: "Post message",
  description: "Sends a message to a channel.",
  method: "POST",
  urlTemplate: "https://api.example.com/messages",
  bodyTemplate: '{"text":"{text}"}',
  isMutating: true,
};

test("a mutating action never calls the network until confirmed", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({})),
  );

  const result = await runConnectorDefinitionAction({
    accessToken: "token",
    actions: [mutatingAction],
    action: "post-message",
    params: { text: "hi" },
  });

  assert.equal(
    fetchMock.mock.callCount(),
    0,
    "the underlying API must not be called",
  );
  assert.deepEqual(result, {
    confirmationRequired: true,
    action: {
      id: "post-message",
      label: "Post message",
      description: "Sends a message to a channel.",
    },
  });
});

test("a mutating action runs once confirmed: true is passed", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({})),
  );

  const result = await runConnectorDefinitionAction({
    accessToken: "token",
    actions: [mutatingAction],
    action: "post-message",
    params: { text: "hi" },
    confirmed: true,
  });

  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(result, {
    item: { id: null, title: null, url: null, raw: "{}" },
  });
});

test("a non-mutating action runs immediately regardless of confirmed", async (t) => {
  t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ items: [] })),
  );

  const result = await runConnectorDefinitionAction({
    accessToken: "token",
    actions: [readAction],
    action: "search",
    params: { query: "x" },
  });

  assert.deepEqual(result, { items: [], nextCursor: undefined });
});

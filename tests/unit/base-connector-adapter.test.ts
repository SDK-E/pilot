import assert from "node:assert/strict";
import { test } from "node:test";

import { runConnectorDefinitionAction } from "@/connectors/adapters/base-connector-adapter";
import { CONNECTOR_SEEDS } from "@/connectors/connector-seed-definitions";

import type { ConnectorDefinitionAction } from "@/db/schema/connector-definitions";

const readAction: ConnectorDefinitionAction = {
  id: "search",
  label: "Search",
  description: "Search records.",
  method: "GET",
  urlTemplate: "https://api.example.com/search?q={query}",
  listPath: "items",
};

const paginatedAction: ConnectorDefinitionAction = {
  id: "list",
  label: "List",
  description: "List records, page by page.",
  method: "GET",
  urlTemplate: "https://api.example.com/list?cursor={cursor}",
  listPath: "items",
  nextCursorPath: "meta.next_cursor",
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

test("a nextCursorPath is extracted and round-trips back into the next call's params", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(
      Response.json({ items: [{ id: "1" }], meta: { next_cursor: "page-2" } }),
    ),
  );

  const first = await runConnectorDefinitionAction({
    accessToken: "token",
    actions: [paginatedAction],
    action: "list",
    params: {},
  });

  assert.equal(
    (first as { nextCursor?: string }).nextCursor,
    "page-2",
    "nextCursorPath must be read out of the response body",
  );

  await runConnectorDefinitionAction({
    accessToken: "token",
    actions: [paginatedAction],
    action: "list",
    params: { cursor: (first as { nextCursor?: string }).nextCursor },
  });

  assert.equal(fetchMock.mock.callCount(), 2);
  const secondCall = fetchMock.mock.calls[1];
  assert.ok(secondCall, "expected a second fetch call for the next page");
  const [secondUrl] = secondCall.arguments as [string];
  assert.equal(
    secondUrl,
    "https://api.example.com/list?cursor=page-2",
    "the cursor returned from the first call must substitute into the next call's urlTemplate",
  );
});

test("Slack's seeded post-message action confirmation-gates chat.postMessage end to end", async (t) => {
  const slackSeed = CONNECTOR_SEEDS.find((seed) => seed.slug === "slack");
  assert.ok(slackSeed, "expected a seeded slack connector");
  const postMessage = slackSeed.actions.find(
    (action) => action.id === "post-message",
  );
  assert.ok(postMessage, "expected slack seed to define post-message");
  assert.equal(postMessage.isMutating, true);

  const fetchMock = t.mock.method(globalThis, "fetch", () =>
    Promise.resolve(Response.json({ ok: true, ts: "1234.5678" })),
  );

  const params = { channel: "C123", text: "hello team" };

  const pending = await runConnectorDefinitionAction({
    accessToken: "xoxb-token",
    actions: slackSeed.actions,
    action: "post-message",
    params,
  });

  assert.equal(
    fetchMock.mock.callCount(),
    0,
    "chat.postMessage must not be called before confirmation",
  );
  assert.deepEqual(pending, {
    confirmationRequired: true,
    action: {
      id: postMessage.id,
      label: postMessage.label,
      description: postMessage.description,
    },
  });

  const confirmed = await runConnectorDefinitionAction({
    accessToken: "xoxb-token",
    actions: slackSeed.actions,
    action: "post-message",
    params,
    confirmed: true,
  });

  assert.equal(fetchMock.mock.callCount(), 1);
  const call = fetchMock.mock.calls[0];
  assert.ok(call, "expected chat.postMessage to have been called");
  const [url, init] = call.arguments as [string, RequestInit];
  assert.equal(url, "https://slack.com/api/chat.postMessage");
  assert.equal(init.method, "POST");
  assert.equal(
    (init.headers as Record<string, string>).authorization,
    "Bearer xoxb-token",
  );
  assert.equal(
    init.body,
    '{"channel":"C123","text":"hello%20team"}',
    "body template placeholders must be substituted from params",
  );
  assert.deepEqual(confirmed, {
    item: {
      id: "1234.5678",
      title: null,
      url: null,
      raw: '{"ok":true,"ts":"1234.5678"}',
    },
  });
});

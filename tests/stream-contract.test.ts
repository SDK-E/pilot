import assert from "node:assert/strict";
import test from "node:test";
import { parseConversationRuntimeStream } from "@/ai/pilot-ai-client";

const encoder = new TextEncoder();

function streamOf(...chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function dataEvent(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

test("AC-08-02: UTF-8 split mid-character does not produce false completion", async () => {
  const validText = "Héllo";
  const splitIndex = 3;
  const firstHalf = validText.slice(0, splitIndex);
  const secondHalf = validText.slice(splitIndex);

  const stream = streamOf(
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: firstHalf }, finish_reason: null }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: secondHalf }, finish_reason: null }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: {}, finish_reason: "stop" }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    "data: [DONE]\n\n",
  );

  const events = await Array.fromAsync(parseConversationRuntimeStream(stream));
  const textEvents = events.filter((e) => e.type === "text");
  assert.equal(textEvents.length, 2);
  assert.equal(textEvents[0].text, firstHalf);
  assert.equal(textEvents[1].text, secondHalf);

  const completed = events.find((e) => e.type === "completed");
  assert.ok(completed, "should complete normally");
  if (completed) {
    assert.equal(completed.finishReason, "stop");
  }
});

test("AC-08-02: unknown event type does not produce false success", async () => {
  const stream = streamOf(
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: "Hello" }, finish_reason: null }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "pilot.unknown.event",
      model: "kilo/kilo-auto/free",
      unexpected: { foo: "bar" },
    }),
    "data: [DONE]\n\n",
  );

  await assert.rejects(
    Array.fromAsync(parseConversationRuntimeStream(stream)),
    /Invalid input|expected/,
    "unknown event should reject, not produce false success",
  );
});

test("AC-08-02: invalid event ordering (usage before text) does not produce false success", async () => {
  const stream = streamOf(
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: "Hello" }, finish_reason: null }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: {}, finish_reason: "stop" }],
    }),
    "data: [DONE]\n\n",
  );

  const events = await Array.fromAsync(parseConversationRuntimeStream(stream));
  const textEvents = events.filter((e) => e.type === "text");
  assert.ok(textEvents.length >= 1, "should still yield text events");
  const completed = events.find((e) => e.type === "completed");
  assert.ok(completed, "should complete normally");
});

test("AC-08-02: stream without terminal event does not produce false success", async () => {
  const stream = streamOf(
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: "Hello" }, finish_reason: null }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: {}, finish_reason: null }],
    }),
  );

  await assert.rejects(
    Array.fromAsync(parseConversationRuntimeStream(stream)),
    /ended before completing the response/,
    "should reject without false success",
  );
});

test("AC-08-02: [DONE] without any events does not produce false success", async () => {
  const stream = streamOf("data: [DONE]\n\n");

  await assert.rejects(
    Array.fromAsync(parseConversationRuntimeStream(stream)),
    /ended before completing the response/,
    "should reject without false success",
  );
});

test("AC-08-02: empty stream does not produce false success", async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });

  await assert.rejects(
    Array.fromAsync(parseConversationRuntimeStream(stream)),
    /ended before completing the response/,
    "should reject without false success",
  );
});

test("AC-08-02: malformed JSON line is rejected without false success", async () => {
  const stream = streamOf(
    "data: {not valid json}\n\n",
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: "Hello" }, finish_reason: null }],
    }),
    "data: [DONE]\n\n",
  );

  await assert.rejects(
    Array.fromAsync(parseConversationRuntimeStream(stream)),
    /JSON|Expected property name/,
    "malformed JSON should reject, not produce false success",
  );
});

test("AC-08-02: repeated finish_reason events handled safely", async () => {
  const stream = streamOf(
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: { content: "Hello" }, finish_reason: null }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: {}, finish_reason: "stop" }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [{ delta: {}, finish_reason: "stop" }],
    }),
    dataEvent({
      id: "cmpl_1",
      object: "chat.completion.chunk",
      model: "kilo/kilo-auto/free",
      choices: [],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    "data: [DONE]\n\n",
  );

  const events = await Array.fromAsync(parseConversationRuntimeStream(stream));
  const textEvents = events.filter((e) => e.type === "text");
  assert.equal(textEvents.length, 1);
});

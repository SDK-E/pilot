import assert from "node:assert/strict";
import test from "node:test";

import { parseRuntimeStream } from "@/ai/runtime-stream";

const encoder = new TextEncoder();

function streamOf(...events: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(event));
      controller.close();
    },
  });
}

test("Pilot accepts streamed text only after a terminal usage event", async () => {
  const chunks = [
    'data: {"id":"chatcmpl_run-1","object":"chat.completion.chunk","model":"kilo/kilo-auto/free","choices":[{"delta":{"content":"Hello"},"finish_reason":null}]}\n\n',
    'data: {"id":"chatcmpl_run-1","object":"chat.completion.chunk","model":"kilo/kilo-auto/free","choices":[{"delta":{},"finish_reason":"stop"}]}\n\n',
    'data: {"id":"chatcmpl_run-1","object":"chat.completion.chunk","model":"kilo/kilo-auto/free","choices":[],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}\n\n',
    "data: [DONE]\n\n",
  ];

  assert.deepEqual(
    await Array.fromAsync(parseRuntimeStream(streamOf(...chunks))),
    [
      { type: "text", text: "Hello" },
      {
        type: "completed",
        modelId: "kilo/kilo-auto/free",
        runId: "run-1",
        finishReason: "stop",
        usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 },
      },
    ],
  );
});

test("Pilot rejects a stream without terminal usage", async () => {
  await assert.rejects(
    Array.fromAsync(
      parseRuntimeStream(
        streamOf(
          'data: {"id":"chatcmpl_run-1","object":"chat.completion.chunk","model":"kilo/kilo-auto/free","choices":[{"delta":{"content":"Partial"},"finish_reason":null}]}\n\n',
          "data: [DONE]\n\n",
        ),
      ),
    ),
    /couldn't complete this response/,
  );
});

test("Pilot recognizes a bounded Ask User suspension", async () => {
  const events = [
    'data: {"id":"chatcmpl_run-2","object":"pilot.user_input.required","model":"kilo/kilo-auto/free","pilot":{"run_id":"run-2","tool_call_id":"call-2","question":"Which audience should I prioritize?","options":[{"label":"Developers"},{"label":"Buyers"}],"selection_mode":"single_select"}}\n\n',
    "data: [DONE]\n\n",
  ];
  assert.deepEqual(
    await Array.fromAsync(parseRuntimeStream(streamOf(...events))),
    [
      {
        type: "user_input_required",
        runId: "run-2",
        toolCallId: "call-2",
        question: "Which audience should I prioritize?",
        options: [{ label: "Developers" }, { label: "Buyers" }],
        selectionMode: "single_select",
      },
    ],
  );
});

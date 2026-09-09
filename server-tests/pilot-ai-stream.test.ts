import assert from "node:assert/strict";
import test from "node:test";
import { parseConversationRuntimeStream } from "@/ai/pilot-ai-client";

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
    await Array.fromAsync(parseConversationRuntimeStream(streamOf(...chunks))),
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
      parseConversationRuntimeStream(
        streamOf(
          'data: {"id":"chatcmpl_run-1","object":"chat.completion.chunk","model":"kilo/kilo-auto/free","choices":[{"delta":{"content":"Partial"},"finish_reason":null}]}\n\n',
          "data: [DONE]\n\n",
        ),
      ),
    ),
    /ended before completing the response/,
  );
});

test("Pilot recognizes a runtime approval suspension without accepting a partial reply", async () => {
  const events = [
    'data: {"id":"chatcmpl_run-1","object":"pilot.approval.required","model":"kilo/kilo-auto/free","pilot":{"run_id":"run-1","tool_call_id":"call-1"}}\n\n',
    "data: [DONE]\n\n",
  ];
  assert.deepEqual(
    await Array.fromAsync(parseConversationRuntimeStream(streamOf(...events))),
    [{ type: "suspended", runId: "run-1", toolCallId: "call-1" }],
  );
});

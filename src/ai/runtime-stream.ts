import {
  PilotAiRuntimeError,
  runIdOf,
  streamChunkSchema,
  streamUserInputSchema,
  toUserInput,
  usageOf,
  type RuntimeEvent,
} from "./runtime-contract";

/**
 * Turns one server-sent event into a runtime event, or `undefined` for
 * events that carry nothing Pilot needs (keep-alives, `[DONE]`).
 */
function parseStreamEvent(event: string): RuntimeEvent | undefined {
  const data = event
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  if (!data || data === "[DONE]") return undefined;

  const raw: unknown = JSON.parse(data);
  const userInput = streamUserInputSchema.safeParse(raw);
  if (userInput.success) return toUserInput(userInput.data.pilot);

  const chunk = streamChunkSchema.parse(raw);
  const text = chunk.choices[0]?.delta.content;
  if (text) return { type: "text", text };
  if (!chunk.usage) return undefined;
  return {
    type: "completed",
    modelId: chunk.model,
    runId: runIdOf(chunk.id),
    finishReason: chunk.choices[0]?.finish_reason ?? "stop",
    usage: usageOf(chunk.usage),
  };
}

/**
 * Splits a byte stream into server-sent events (blank-line separated).
 */
async function* sseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string> {
  const decoder = new TextDecoder();
  const reader = body.getReader();
  let buffer = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      yield* events;
    }
  } finally {
    reader.releaseLock();
  }
  buffer += decoder.decode();
  if (buffer) yield buffer;
}

/**
 * Yields text as it arrives, then exactly one terminal event: a user-input
 * request, or the completion with usage.
 */
export async function* parseRuntimeStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<RuntimeEvent> {
  let terminal: RuntimeEvent | undefined;
  for await (const event of sseEvents(body)) {
    const parsed = parseStreamEvent(event);
    if (!parsed) continue;
    if (parsed.type === "text") yield parsed;
    else terminal ??= parsed;
  }
  if (!terminal) {
    throw new PilotAiRuntimeError(
      "Pilot couldn't complete this response. Try sending it again.",
      { cause: "Runtime stream ended before a terminal event." },
    );
  }
  yield terminal;
}

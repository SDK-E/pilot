/**
 * The browser-facing reply stream's wire format: real `text/event-stream`
 * framing (`data: <json>\n\n` per event) instead of plain, structure-less
 * text — see ADR-0029. Shared by the server (`conversation-turn.ts`, which
 * encodes) and the client (`use-sse-completion.ts`, which decodes), so
 * both sides agree on the event shape without duplicating it.
 */

export type StreamEvent =
  { type: "text"; text: string } | { type: "error"; message: string };

const encoder = new TextEncoder();

export function encodeStreamEvent(event: StreamEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Splits a decoded SSE text buffer into complete `data: ...` frames plus
 * whatever incomplete tail remains (fed back in on the next chunk).
 */
export function parseStreamEvents(buffer: string): {
  events: StreamEvent[];
  remainder: string;
} {
  const frames = buffer.split("\n\n");
  const remainder = frames.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const frame of frames) {
    const line = frame.split("\n").find((entry) => entry.startsWith("data: "));
    if (!line) continue;
    try {
      events.push(JSON.parse(line.slice("data: ".length)) as StreamEvent);
    } catch {
      // A truncated or malformed frame is dropped rather than surfaced —
      // the terminal HTTP status/close already carries success or failure.
    }
  }
  return { events, remainder };
}

const MAX_PARTIAL_REPLY_CHARS = 6000;
const TRUNCATION_MARKER = "…(earlier part omitted)…";

/**
 * The synthetic turn sent to resume a stopped reply. pilot-ai's Mastra
 * thread never saw the cut-off text (an aborted generation leaves no trace
 * in its memory — see ADR-0020), so it has to be reintroduced here, in the
 * one `message` slot the runtime contract exposes. Bounded to the tail of
 * the partial text: for resuming a cut-off reply, what matters is where it
 * stopped, not how it began.
 */
export function buildContinuationPrompt(partialReply: string): string {
  const trimmed = partialReply.trim();
  const bounded =
    trimmed.length > MAX_PARTIAL_REPLY_CHARS
      ? `${TRUNCATION_MARKER}${trimmed.slice(-MAX_PARTIAL_REPLY_CHARS)}`
      : trimmed;
  return [
    "Continue your previous response, which was cut off partway through.",
    "Resume writing exactly where it stopped — do not repeat, summarize, or restart any of it.",
    "Your previous response so far:",
    bounded,
  ].join("\n\n");
}

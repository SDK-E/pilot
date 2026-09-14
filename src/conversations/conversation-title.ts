const maximumTitleLength = 60;

// Stripped repeatedly from the front so a title reads as a topic rather than
// a request verbatim ("Hey, could you please help me..." -> the actual ask).
// Kept as small, non-nested patterns rather than combining them with
// optional groups, which read cleaner and can't backtrack badly.
const FILLER_PREFIXES = [
  /^(?:hi|hey|hello|yo)[,!.\s]+/i,
  /^(?:please|pls)[,\s]+/i,
  /^(?:so|ok(?:ay)?|well)[,\s]+/i,
  /^can\s+you\s+please\s+/i,
  /^can\s+you\s+/i,
  /^could\s+you\s+please\s+/i,
  /^could\s+you\s+/i,
  /^would\s+you\s+please\s+/i,
  /^would\s+you\s+/i,
  /^i'd\s+like\s+you\s+to\s+/i,
  /^i'd\s+like\s+to\s+/i,
  /^i\s+would\s+like\s+you\s+to\s+/i,
  /^i\s+would\s+like\s+to\s+/i,
  /^i\s+need\s+you\s+to\s+/i,
  /^i\s+need\s+help\s+with\s+/i,
  /^i\s+need\s+help\s+to\s+/i,
  /^i\s+need\s+/i,
  /^i\s+want\s+/i,
  /^help\s+me\s+to\s+/i,
  /^help\s+me\s+/i,
];

function stripFiller(message: string): string {
  let current = message;
  // Bounded by the pattern count: each full pass can strip at most one
  // layer of filler, and layered filler is never deeper than that.
  let remainingPasses = FILLER_PREFIXES.length;
  while (remainingPasses > 0) {
    remainingPasses -= 1;
    let stripped = current;
    for (const pattern of FILLER_PREFIXES) {
      stripped = stripped.replace(pattern, "");
    }
    if (stripped === current) break;
    current = stripped.trimStart();
  }
  return current;
}

function stripTrailingDots(text: string): string {
  let end = text.length;
  while (end > 0 && text.charAt(end - 1) === ".") end -= 1;
  return text.slice(0, end);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Derives a short, title-like label from the opening prompt: strips common
 * filler ("hey", "could you please…") so the topic leads, then truncates on
 * a word boundary. This stays a local, deterministic transform rather than
 * an extra model call, so it never makes a request or sends conversation
 * content to another service just to name the chat.
 */
export function deriveConversationTitle(message: string): string {
  const normalized = message.replaceAll(/\s+/g, " ").trim();
  const topic = stripTrailingDots(stripFiller(normalized).trimEnd());
  const title = capitalize(topic || normalized);
  if (title.length <= maximumTitleLength) return title;

  const prefix = title.slice(0, maximumTitleLength - 1);
  const lastSpace = prefix.lastIndexOf(" ");
  return `${(lastSpace > 24 ? prefix.slice(0, lastSpace) : prefix).trim()}…`;
}

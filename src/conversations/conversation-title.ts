const maximumTitleLength = 72;

/**
 * Creates a stable, local title from the opening prompt. It avoids making an
 * extra model request or sending conversation content to another service.
 */
export function deriveConversationTitle(message: string): string {
  const normalized = message.replaceAll(/\s+/g, " ").trim();
  if (normalized.length <= maximumTitleLength) return normalized;

  const prefix = normalized.slice(0, maximumTitleLength - 1);
  const lastSpace = prefix.lastIndexOf(" ");
  return `${(lastSpace > 24 ? prefix.slice(0, lastSpace) : prefix).trim()}…`;
}

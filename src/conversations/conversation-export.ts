export interface ExportBlock {
  heading: boolean;
  text: string;
}

export interface ExportMessage {
  id: string;
  role: "user" | "worker";
  content: string;
}

export interface ExportSource {
  messageId: string;
  title: string;
  domain: string;
  url: string;
  summary: string;
}

/**
 * Converts supported Markdown into readable text blocks for the PDF export.
 */
export function exportBlocks(content: string): ExportBlock[] {
  return content
    .replaceAll(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-z]*\n?/i, ""),
    )
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({
      heading: /^#{1,6}\s+/.test(value),
      text: value
        .replaceAll(/^#{1,6}\s+/gm, "")
        .replaceAll(/^[-*+]\s+/gm, "• ")
        .replaceAll(/\[([^\][]+)\]\([^()]+\)/g, "$1")
        .replaceAll(/(`{1,3}|\*{1,3}|_{1,3})/g, "")
        .trim(),
    }));
}

/**
 * The Markdown export: one section per message with its cited sources.
 */
export function exportMarkdown(
  messages: ExportMessage[],
  sources: ExportSource[],
): string {
  return messages
    .map((message) =>
      [
        `## ${message.role === "user" ? "You" : "Pilot"}`,
        "",
        message.content,
        ...sources
          .filter((source) => source.messageId === message.id)
          .map(
            (source) =>
              `- [${source.title}](${source.url}) — ${source.summary}`,
          ),
        "",
      ].join("\n"),
    )
    .join("\n");
}

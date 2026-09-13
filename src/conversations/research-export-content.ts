export interface ExportContentBlock {
  heading: boolean;
  text: string;
}

/**
Converts supported Markdown into the readable PDF text blocks Pilot exports.
*/
export function researchExportBlocks(content: string): ExportContentBlock[] {
  return content
    .replaceAll(/```[\s\S]*?```/g, (block) =>
      block.replace(/```[a-z]*\n?/i, ""),
    )
    .split(/\n{2,}/)
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => ({
      heading: /^(#{1,6})\s+/.test(value),
      text: value
        .replaceAll(/^#{1,6}\s+/gm, "")
        .replaceAll(/^[-*+]\s+/gm, "• ")
        .replaceAll(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
        .replaceAll(/(`{1,3}|\*{1,3}|_{1,3})/g, "")
        .trim(),
    }));
}

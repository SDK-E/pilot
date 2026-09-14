import { RiDownloadLine, RiFileTextLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";

export function ConversationExportLinks({
  conversationId,
}: {
  conversationId: string;
}) {
  const href = (format: "md" | "pdf") =>
    `/api/conversations/${conversationId}/export?format=${format}`;
  return (
    <div className="flex items-center gap-1">
      <Button asChild size="sm" type="button" variant="ghost">
        <a href={href("md")}>
          <RiDownloadLine aria-hidden="true" /> Markdown
        </a>
      </Button>
      <Button asChild size="sm" type="button" variant="ghost">
        <a href={href("pdf")}>
          <RiFileTextLine aria-hidden="true" /> PDF
        </a>
      </Button>
    </div>
  );
}

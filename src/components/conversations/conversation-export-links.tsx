import { Download, FileText } from "lucide-react";

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
          <Download aria-hidden="true" className="size-3.5" /> Markdown
        </a>
      </Button>
      <Button asChild size="sm" type="button" variant="ghost">
        <a href={href("pdf")}>
          <FileText aria-hidden="true" className="size-3.5" /> PDF
        </a>
      </Button>
    </div>
  );
}

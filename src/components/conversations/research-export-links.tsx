import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ResearchExportLinks({
  conversationId,
  workerId,
}: {
  conversationId: string;
  workerId: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button asChild size="sm" type="button" variant="ghost">
        <a
          href={`/api/conversations/${conversationId}/export?workerId=${workerId}&format=md`}
        >
          <Download aria-hidden="true" className="size-3.5" /> Markdown
        </a>
      </Button>
      <Button asChild size="sm" type="button" variant="ghost">
        <a
          href={`/api/conversations/${conversationId}/export?workerId=${workerId}&format=html`}
        >
          <FileText aria-hidden="true" className="size-3.5" /> Print / PDF
        </a>
      </Button>
    </div>
  );
}

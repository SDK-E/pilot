import { MessageResponse } from "@/components/ai-elements/message";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import {
  MESSAGE_RESPONSE_COMPONENTS,
  MESSAGE_RESPONSE_CONTROLS,
} from "../message-response-controls";

/**
 * The private scratchpad the agent may save for this chat. Rendered through
 * the same Markdown component as a reply, not a raw `<pre>` — the agent
 * writes these as normal prose (headings, lists, bold), and a literal `##`
 * or `**` on screen would read as broken, not "working notes."
 */
export function NotesSection({ scratchpad }: { scratchpad: string }) {
  if (!scratchpad) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium">Working notes</h2>
      <Accordion collapsible type="single">
        <AccordionItem value="notes">
          <AccordionTrigger>View saved notes</AccordionTrigger>
          <AccordionContent>
            <div className="max-h-60 overflow-auto text-xs text-muted-foreground">
              <MessageResponse
                components={MESSAGE_RESPONSE_COMPONENTS}
                controls={MESSAGE_RESPONSE_CONTROLS}
              >
                {scratchpad}
              </MessageResponse>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  );
}

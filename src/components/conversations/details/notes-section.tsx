import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/**
 * The private scratchpad the agent may save for this chat.
 */
export function NotesSection({ scratchpad }: { scratchpad: string }) {
  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-xs font-medium">Working notes</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Context the agent chooses to save for this chat.
        </p>
      </div>
      {scratchpad ? (
        <Accordion collapsible type="single">
          <AccordionItem value="notes">
            <AccordionTrigger>View saved notes</AccordionTrigger>
            <AccordionContent>
              <pre className="max-h-60 overflow-auto whitespace-pre-wrap text-muted-foreground">
                {scratchpad}
              </pre>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <p className="text-xs text-muted-foreground">
          Working notes appear when the agent saves durable context.
        </p>
      )}
    </section>
  );
}

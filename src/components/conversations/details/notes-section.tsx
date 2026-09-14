import { ChevronRight } from "lucide-react";

/**
 * The private scratchpad the agent may save for this chat.
 */
export function NotesSection({ scratchpad }: { scratchpad: string }) {
  return (
    <section>
      <h2 className="text-sm font-medium">Working notes</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Context the agent chooses to save for this chat.
      </p>
      {scratchpad ? (
        <details className="group mt-3 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
            View saved notes
            <ChevronRight
              aria-hidden="true"
              className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
            />
          </summary>
          <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
            {scratchpad}
          </pre>
        </details>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Working notes appear when the agent saves durable context.
        </p>
      )}
    </section>
  );
}

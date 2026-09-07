import { ChevronRight, LoaderCircle } from "lucide-react";

/** Displays a browser-observed stream state. It is deliberately not persisted. */
export function LiveConversationActivity() {
  return (
    <details className="group mt-1 w-fit rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight
          aria-hidden="true"
          className="size-3.5 transition-transform group-open:rotate-90"
        />
        <LoaderCircle
          aria-hidden="true"
          className="size-3.5 animate-spin text-primary"
        />
        Pilot is responding…
      </summary>
      <p className="mt-2 border-l border-border pl-3">
        Generating a response through Pilot Conversation.
      </p>
    </details>
  );
}

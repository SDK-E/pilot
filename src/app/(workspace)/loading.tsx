import { Loader2 } from "lucide-react";

export default function WorkspaceLoading() {
  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-1 items-center justify-center">
      <Loader2
        className="size-8 animate-spin text-muted-foreground"
        aria-hidden="true"
      />
    </main>
  );
}

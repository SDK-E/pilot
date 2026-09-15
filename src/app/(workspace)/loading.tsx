import { Spinner } from "@/components/ui/spinner";

export default function WorkspaceLoading() {
  return (
    <main className="flex min-h-[calc(100svh-var(--header-height))] flex-1 items-center justify-center">
      <Spinner className="size-6 text-muted-foreground" />
    </main>
  );
}

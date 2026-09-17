import { Skeleton } from "@/components/ui/skeleton";

const SUGGESTION_PLACEHOLDER_COUNT = 3;

export default function WorkspaceLoading() {
  return (
    <main className="flex min-h-[calc(100svh-var(--header-height))] flex-1 flex-col items-center p-6 sm:py-16">
      <section className="w-full max-w-2xl space-y-8">
        <header className="flex flex-col items-center space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </header>
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="flex flex-wrap justify-center gap-2">
          {Array.from({ length: SUGGESTION_PLACEHOLDER_COUNT }, (_, index) => (
            <Skeleton className="h-7 w-28 rounded-full" key={index} />
          ))}
        </div>
      </section>
    </main>
  );
}

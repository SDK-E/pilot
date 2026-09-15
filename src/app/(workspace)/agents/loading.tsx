import { Skeleton } from "@/components/ui/skeleton";

const AGENT_KIND_COUNT = 3;
const AGENT_CARD_PLACEHOLDER_COUNT = 2;

export default function AgentsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      {Array.from({ length: AGENT_KIND_COUNT }, (_, kindIndex) => (
        <div className="space-y-3" key={kindIndex}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-28" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from(
              { length: AGENT_CARD_PLACEHOLDER_COUNT },
              (_, cardIndex) => (
                <Skeleton className="h-24 w-full" key={cardIndex} />
              ),
            )}
          </div>
        </div>
      ))}
    </main>
  );
}

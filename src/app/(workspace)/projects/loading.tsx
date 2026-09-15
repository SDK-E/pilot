import { Skeleton } from "@/components/ui/skeleton";

const PROJECT_CARD_PLACEHOLDER_COUNT = 4;

export default function ProjectsLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: PROJECT_CARD_PLACEHOLDER_COUNT }, (_, index) => (
          <Skeleton className="h-40 w-full" key={index} />
        ))}
      </div>
    </main>
  );
}

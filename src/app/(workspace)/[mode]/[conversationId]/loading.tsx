import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationLoading() {
  return (
    <main className="flex h-[calc(100svh-var(--header-height))] flex-col overflow-hidden bg-background">
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
        <Skeleton className="ml-auto h-10 w-2/3 rounded-xl" />
        <Skeleton className="h-24 w-5/6 rounded-xl" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-xl" />
      </div>
      <div className="mx-auto w-full max-w-3xl shrink-0 p-4">
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    </main>
  );
}

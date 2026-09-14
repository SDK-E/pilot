import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </main>
  );
}

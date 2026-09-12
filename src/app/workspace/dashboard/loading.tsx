export default function DashboardLoading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-6 py-10">
      <div className="h-9 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </main>
  );
}

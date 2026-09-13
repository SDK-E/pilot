export default function WorkLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <div className="space-y-3">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-9 w-56 animate-pulse rounded bg-muted" />
        <div className="h-5 w-full max-w-xl animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div className="h-24 animate-pulse rounded-xl bg-muted" key={index} />
        ))}
      </div>
      <div className="h-52 animate-pulse rounded-xl bg-muted" />
    </main>
  );
}

"use client";

import { Button } from "@/components/ui/button";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl space-y-6 px-6 py-24">
      <h1 className="text-2xl">Workspace unavailable</h1>
      <p className="text-muted-foreground">
        We could not verify your organization access. Try again, or contact your
        administrator if this continues.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}

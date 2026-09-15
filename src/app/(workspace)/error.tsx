"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-var(--header-height))] max-w-xl items-center px-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Workspace unavailable</EmptyTitle>
          <EmptyDescription>
            We could not verify your organization access. Try again, or contact
            your administrator if this continues.
          </EmptyDescription>
        </EmptyHeader>
        <Button onClick={reset}>Try again</Button>
      </Empty>
    </main>
  );
}

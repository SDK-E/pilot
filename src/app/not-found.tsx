import Link from "next/link";

import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <PilotWordmark className="text-lg" />
      <h1 className="font-heading text-2xl font-semibold tracking-tight">
        Page not found
      </h1>
      <p className="text-sm text-muted-foreground">
        That page doesn&apos;t exist, or it moved.
      </p>
      <Button asChild>
        <Link href="/">Back to Pilot</Link>
      </Button>
    </main>
  );
}

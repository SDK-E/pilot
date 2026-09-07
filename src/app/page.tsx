import { withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowUpRight } from "lucide-react";
import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { user } = await withAuth();
  return (
    <main className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 py-8 sm:px-12">
      <header className="flex items-center justify-between border-b border-border pb-6">
        <PilotWordmark className="text-lg" />
        <span className="text-xs text-muted-foreground">SDK Enterprises</span>
      </header>
      <div className="flex flex-1 items-center py-12 sm:py-16">
        <section className="max-w-2xl space-y-8">
          <p className="text-sm font-medium text-primary">AI workspace</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Give your team a place to think, research, and move work forward.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Pilot brings your organization&apos;s conversations and configured
            agents into one focused workspace.
          </p>
          <Button asChild size="lg" className="h-12 px-6">
            <a href={user ? "/workspace" : "/sign-in"}>
              {user ? "Open workspace" : "Sign in to Pilot"}
              <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </section>
      </div>
      <footer className="flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
        <span>Built by SDK Enterprises</span>
        <a
          className="underline underline-offset-4"
          href="https://github.com/SDK-E/pilot"
        >
          Open source on GitHub
        </a>
      </footer>
    </main>
  );
}

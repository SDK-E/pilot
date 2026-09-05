import Image from "next/image";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "./logo.png";

export default async function Home() {
  const { user } = await withAuth();
  return (
    <main className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 py-8 sm:px-12">
      <header className="flex items-center justify-between border-b border-border pb-6 text-xs">
        <span>SDK ENTERPRISES / PILOT</span>
        <span className="text-muted-foreground">AI WORKFORCE PLATFORM</span>
      </header>
      <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-2 lg:gap-16">
        <Image
          src={logo}
          alt="Pilot by SDK Enterprises"
          priority
          className="w-full rounded-xl"
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
        <section className="max-w-lg space-y-8">
          <p className="text-xs tracking-widest text-primary">
            YOUR WORKFORCE. YOUR DIRECTION.
          </p>
          <h1 className="text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Organize.
            <br />
            Delegate.
            <br />
            Get things done<span className="text-primary">_</span>
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            A shared place for your organization and its AI workers. Sign in to
            access your workspace.
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

import { Button } from "@/components/ui/button";

export function CtaBand({
  isSignedIn,
  heading = "Start using Pilot today",
  body = "Free during early access. No credit card, no setup.",
}: {
  isSignedIn: boolean;
  heading?: string;
  body?: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-4 rounded-lg bg-primary/10 px-6 py-12 text-center">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {heading}
        </h2>
        <p className="max-w-md text-sm text-muted-foreground">{body}</p>
        <Button asChild size="lg">
          <a href={isSignedIn ? "/chat" : "/sign-in"}>
            {isSignedIn ? "Open workspace" : "Get started free"}
          </a>
        </Button>
      </div>
    </section>
  );
}

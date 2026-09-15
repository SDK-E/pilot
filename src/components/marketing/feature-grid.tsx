import { RiChat3Line, RiCodeSSlashLine, RiListCheck3 } from "@remixicon/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * The three modes, described by what each one does for the person using
 * it — grounded in `src/agents/agent-kinds.ts`, not invented capability
 * copy.
 */
const FEATURES = [
  {
    icon: RiChat3Line,
    title: "Chat",
    body: "Ask a question, get a clear answer. Pilot pushes back with a follow-up question when it would change the result, instead of guessing.",
  },
  {
    icon: RiListCheck3,
    title: "Work",
    body: "Describe a task once. Pilot turns it into a visible step-by-step plan and works through it, so you can see exactly what it's doing and why.",
  },
  {
    icon: RiCodeSSlashLine,
    title: "Code",
    body: "Point Pilot at a change. It reads the code first, proposes a small reviewable diff, and never claims to have run something it didn't run.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" id="product">
      <div className="max-w-2xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Three modes. One place to work.
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Pick the mode that fits the moment — every conversation lives in the
          same workspace.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <Card key={title}>
            <CardHeader>
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <CardTitle className="mt-2 text-base">{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs/relaxed">
                {body}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

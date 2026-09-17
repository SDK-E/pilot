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
    body: 'Ask a real question — "what changed in our refund policy last quarter?" — and get a straight answer, or a sharper question back when guessing would cost you.',
  },
  {
    icon: RiListCheck3,
    title: "Work",
    body: "Hand off a task like onboarding a new client, and watch the plan appear before a single step runs. You approve the plan, not just the outcome.",
  },
  {
    icon: RiCodeSSlashLine,
    title: "Code",
    body: "Point it at a flaky test or a gnarly bug. It reads the code, opens a small diff, and never tells you something ran when it didn't.",
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

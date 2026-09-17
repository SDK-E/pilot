import { RiEyeLine, RiFlashlightLine, RiRouteLine } from "@remixicon/react";

/**
 * Makes the transparency differentiator visible as a mechanism, not just
 * a claim in prose. Structured as short, factual steps on purpose — this
 * is the shape both featured snippets and LLM answer engines quote well.
 */
const STEPS = [
  {
    icon: RiRouteLine,
    title: "You ask, Pilot plans",
    body: "Anything more than a one-shot question gets a plan first — before Pilot runs a single step of it.",
  },
  {
    icon: RiEyeLine,
    title: "You see every tool call",
    body: "Every search, connector call, and code change is logged with what actually happened — not a summary of what it meant to do.",
  },
  {
    icon: RiFlashlightLine,
    title: "You get a result you can check",
    body: "An answer, a finished plan, or a diff you can review — never a claim dressed up as a result.",
  },
] as const;

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" id="how-it-works">
      <div className="max-w-2xl">
        <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          How Pilot works
        </h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          The same three steps behind every answer, task, and code change.
        </p>
      </div>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li className="space-y-2" key={step.title}>
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {index + 1}
              </span>
              <step.icon aria-hidden="true" className="size-4 text-primary" />
            </div>
            <p className="text-sm font-medium">{step.title}</p>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {step.body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

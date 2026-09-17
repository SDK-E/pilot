import Link from "next/link";

import { Badge } from "@/components/ui/badge";

/**
 * Deliberately honest: no fabricated customer quotes, logos, or usage
 * stats. Pilot doesn't have public customers yet, and presenting invented
 * ones as real would be deceptive advertising. This section runs on real,
 * verifiable-today signals instead and is built to hold genuine
 * testimonials once they exist — swap the paragraph below for a quote grid
 * without touching the surrounding layout.
 */
export function SocialProof() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Badge variant="outline">Early access</Badge>
        <h2 className="mt-4 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
          We&apos;d rather show our work than show you a logo wall.
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pilot is a new product, built in the open. Your conversations,
          projects, and files stay scoped to you — being a member of your
          organization never grants access to someone else&apos;s data. Read the{" "}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/blog"
          >
            blog
          </Link>{" "}
          for what&apos;s shipping, or{" "}
          <Link
            className="underline underline-offset-4 hover:text-foreground"
            href="/contact"
          >
            talk to us directly
          </Link>{" "}
          before you sign up.
        </p>
      </div>
    </section>
  );
}

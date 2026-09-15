import Link from "next/link";

import { Badge } from "@/components/ui/badge";

/**
 * Deliberately honest: no fabricated customer quotes, logos, or usage
 * stats. Pilot doesn't have public customers yet, and presenting invented
 * ones as real would be deceptive advertising. This section runs on real
 * signals instead and is built to hold genuine testimonials once they
 * exist — swap the paragraph below for a quote grid without touching the
 * surrounding layout.
 */
export function SocialProof() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <Badge variant="outline">Early access</Badge>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pilot is a new product, built in the open with the teams using it.
          We&apos;re not going to show you invented reviews to make it look
          otherwise — read the{" "}
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
          if you want to know more before signing up.
        </p>
      </div>
    </section>
  );
}

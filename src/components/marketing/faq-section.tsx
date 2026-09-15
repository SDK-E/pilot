import { JsonLd } from "@/components/marketing/json-ld";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import type { FaqItem } from "@/marketing/faq";

/**
 * Renders an FAQ accordion and its matching FAQPage JSON-LD, so the exact
 * question/answer text AI Overviews and chat assistants might extract is
 * the same text a visitor reads.
 */
export function FaqSection({
  title,
  items,
}: {
  title: string;
  items: readonly FaqItem[];
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <Accordion className="mt-6 border-none" type="multiple">
        {items.map((item) => (
          <AccordionItem key={item.question} value={item.question}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>
              <p>{item.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }}
      />
    </section>
  );
}

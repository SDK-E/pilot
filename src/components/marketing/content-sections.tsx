import type { ContentSection } from "@/marketing/content";

export function ContentSections({
  sections,
}: {
  sections: readonly ContentSection[];
}) {
  return (
    <div className="mt-8 space-y-8">
      {sections.map((section) => (
        <section className="space-y-3" key={section.heading}>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {section.heading}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              className="text-sm leading-relaxed text-muted-foreground sm:text-base"
              key={paragraph}
            >
              {paragraph}
            </p>
          ))}
          {section.list ? (
            <ul className="ml-4 list-disc space-y-1.5 text-sm text-muted-foreground sm:text-base">
              {section.list.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}

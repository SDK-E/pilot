/**
 * Inline structured-data script. `JSON.stringify` (not manual string
 * building) avoids HTML-escaping pitfalls in the emitted JSON.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      type="application/ld+json"
    />
  );
}

/**
 * The heading block every workspace page starts with.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        {eyebrow ? (
          <p className="text-xs text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-xs/relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-1">{actions}</div>
      ) : null}
    </header>
  );
}

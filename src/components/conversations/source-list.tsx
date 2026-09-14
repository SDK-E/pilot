interface Source {
  title: string;
  domain: string;
  url: string;
}

export function SourceList({ sources }: { sources: Source[] }) {
  return (
    <details className="mt-3 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
      <summary className="cursor-pointer font-medium">
        Sources ({sources.length})
      </summary>
      <ul className="mt-2 space-y-2">
        {sources.map((source) => (
          <li key={source.url}>
            <a
              className="text-primary underline"
              href={source.url}
              rel="noreferrer"
              target="_blank"
            >
              {source.title}
            </a>
            <span className="ml-2 text-muted-foreground">{source.domain}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}

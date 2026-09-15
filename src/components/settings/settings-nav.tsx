interface SettingsNavItem {
  id: string;
  label: string;
}

/**
 * A plain anchor list rather than shadcn Tabs: Tabs would hide the Danger
 * Zone behind a click, working against making it more visible, not less.
 * Desktop-only — the sections read fine as one scroll on narrower viewports.
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  return (
    <nav
      aria-label="Settings sections"
      className="hidden h-fit w-48 shrink-0 space-y-1 lg:sticky lg:top-(--header-height) lg:block"
    >
      {items.map((item) => (
        <a
          className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          href={`#${item.id}`}
          key={item.id}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

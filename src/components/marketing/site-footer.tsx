import { PilotWordmark } from "@/components/brand/pilot-wordmark";
import { MARKETING_FOOTER_LINKS } from "@/marketing/nav-links";

/**
 * Public marketing footer. Every link here is real — Pilot is not open
 * source, so this deliberately does not claim otherwise.
 */
export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="space-y-2">
            <PilotWordmark className="text-base" />
            <p className="max-w-xs text-xs text-muted-foreground">
              One workspace for chat, task work, and code — built by SDK
              Enterprises.
            </p>
          </div>
          {Object.entries(MARKETING_FOOTER_LINKS).map(([group, links]) => (
            <div className="space-y-2" key={group}>
              <p className="text-xs font-medium text-foreground">{group}</p>
              <ul className="space-y-1.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <a
                      className="text-xs text-muted-foreground hover:text-foreground"
                      href={link.href}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-6 text-[0.7rem] text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} SDK Enterprises.</span>
          <span>Built by SDK Enterprises</span>
        </div>
      </div>
    </footer>
  );
}

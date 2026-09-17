import { RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";

import { requirePlatformAdmin } from "@/platform/platform-session";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s · Pilot Admin", default: "Pilot Admin" },
};

const NAV_ITEMS = [
  { href: "/admin/model-gateways", label: "Model gateways" },
  { href: "/admin/admins", label: "Admins" },
] as const;

/**
 * The platform admin panel: settings that apply across every organization
 * (model gateways and who else can administer Pilot), gated on
 * `platform_admins` rather than any organization's own membership role.
 */
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requirePlatformAdmin();

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              href="/chat"
            >
              <RiArrowLeftLine aria-hidden="true" className="size-4" />
              Workspace
            </Link>
            <span className="text-sm font-medium">Pilot Admin</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {session.user.email} · {session.role}
          </span>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-4 px-6">
          {NAV_ITEMS.map((item) => (
            <Link
              className="border-b-2 border-transparent px-1 py-2.5 text-sm text-muted-foreground hover:text-foreground"
              href={item.href}
              key={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}

import { AdminManagement } from "@/components/platform/admin-management";
import { PageHeader } from "@/components/workspace/page-header";
import { listPlatformAdmins } from "@/platform/platform-admin-repository";
import { requirePlatformAdmin } from "@/platform/platform-session";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const session = await requirePlatformAdmin();
  const admins = await listPlatformAdmins();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        description="Everyone who can open this panel and change platform-wide settings — separate from any organization's own owner/admin members."
        title="Admins"
      />
      <AdminManagement
        admins={admins}
        currentWorkosUserId={session.user.id}
        isSuperadmin={session.role === "superadmin"}
      />
    </div>
  );
}

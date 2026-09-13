import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { WorkQueue } from "@/components/work/work-queue";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listTasks } from "@/tasks/task-repository";

export default async function WorkPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    redirect("/workspace");
  return (
    <WorkQueue tasks={await listTasks({ organizationId, userId: user.id })} />
  );
}

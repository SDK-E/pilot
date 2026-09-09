import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listApprovals } from "@/approvals/approval-repository";
export default async function ApprovalsPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId) redirect("/workspace");
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    redirect("/workspace");
  const approvals = await listApprovals({ organizationId, userId: user.id });
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <h1 className="text-3xl font-medium">Approvals</h1>
      {approvals.length ? (
        <ul className="space-y-2">
          {approvals.map((approval) => (
            <li
              className="rounded-lg border border-border p-4"
              key={approval.id}
            >
              {approval.summary}{" "}
              <span className="text-muted-foreground">{approval.status}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
          No approvals are waiting.
        </p>
      )}
    </main>
  );
}

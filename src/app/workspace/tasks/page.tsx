import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listTasks } from "@/tasks/task-repository";
import { createTaskAction } from "./actions";

export default async function TasksPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId) redirect("/workspace");
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) redirect("/workspace");
  const tasks = await listTasks(organizationId);
  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-6 py-10">
      <header>
        <p className="text-sm text-muted-foreground">
          {membership.organizationName}
        </p>
        <h1 className="text-3xl font-medium">Tasks</h1>
        <p className="mt-2 text-muted-foreground">
          Task execution and approvals will appear here.
        </p>
      </header>
      <form
        action={createTaskAction}
        className="grid gap-3 rounded-lg border border-border p-4"
      >
        <input
          className="rounded-md border border-border bg-background px-3 py-2"
          name="title"
          placeholder="Task title"
          required
          maxLength={200}
        />
        <textarea
          className="min-h-24 rounded-md border border-border bg-background px-3 py-2"
          name="instructions"
          placeholder="Describe the intended outcome"
          required
          maxLength={10000}
        />
        <button
          className="w-fit rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          type="submit"
        >
          Create task
        </button>
      </form>
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
          No tasks yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li className="rounded-lg border border-border p-4" key={task.id}>
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-muted-foreground">{task.status}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

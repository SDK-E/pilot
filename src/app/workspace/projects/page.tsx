import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Button } from "@/components/ui/button";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { listProjects } from "@/projects/project-repository";
import { createProjectAction } from "./actions";

export default async function ProjectsPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId)) {
    redirect("/workspace");
  }
  if (!(await getActiveOrganizationMembership(user.id, organizationId))) {
    redirect("/workspace");
  }
  const projects = await listProjects({ organizationId, userId: user.id });

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-sm text-muted-foreground">Private projects</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Group your own conversations around a focused piece of work.
        </p>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Project instructions and optional shared memory are available. Files
          and knowledge stay disabled until their protected storage and
          retrieval contracts are implemented.
        </p>
      </header>
      <form
        action={createProjectAction}
        className="grid gap-3 rounded-2xl border border-border bg-card/50 p-5 sm:grid-cols-[1fr_auto]"
      >
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="project-name">
            New project
          </label>
          <input
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
            id="project-name"
            maxLength={100}
            name="name"
            placeholder="Project name"
            required
          />
          <textarea
            className="min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            maxLength={10_000}
            name="instructions"
            placeholder="Optional project instructions"
          />
        </div>
        <Button className="self-end" type="submit">
          Create project
        </Button>
      </form>
      {projects.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                className="block rounded-2xl border border-border bg-card/50 p-5 transition-colors hover:bg-muted/50"
                href={`/workspace/projects/${project.id}`}
              >
                <p className="font-medium">{project.name}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                  {project.instructions || "No project instructions yet."}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          Create a project to organize conversations around a piece of work.
        </p>
      )}
    </main>
  );
}

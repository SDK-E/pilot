import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { listOrganizationConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import {
  getProject,
  listProjectConversations,
} from "@/projects/project-repository";
import {
  addProjectConversationAction,
  removeProjectConversationAction,
  updateProjectAction,
} from "../actions";

export default async function ProjectPage({
  params,
}: PageProps<"/workspace/projects/[projectId]">) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  if (!(await getActiveOrganizationMembership(user.id, organizationId)))
    redirect("/workspace");
  const owner = { organizationId, userId: user.id, projectId };
  const [project, projectChats, chats] = await Promise.all([
    getProject(owner),
    listProjectConversations(owner),
    listOrganizationConversations(organizationId, user.id),
  ]);
  if (!project) notFound();
  const contained = new Set(projectChats.map((chat) => chat.id));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link
            className="text-sm text-muted-foreground hover:text-foreground"
            href="/workspace/projects"
          >
            Projects
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {project.name}
          </h1>
        </div>
        <DeleteProjectButton projectId={project.id} />
      </header>
      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="font-medium">Project settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Project instructions apply to conversations in this project. Shared
          memory is opt-in and stays scoped to your private project chats.
        </p>
        <form action={updateProjectAction} className="mt-4 space-y-3">
          <input name="projectId" type="hidden" value={project.id} />
          <input
            className="h-9 w-full rounded-xl border border-border bg-background px-3 text-sm"
            defaultValue={project.name}
            maxLength={100}
            name="name"
            required
          />
          <textarea
            className="min-h-24 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            defaultValue={project.instructions ?? ""}
            maxLength={10_000}
            name="instructions"
            placeholder="Instructions for work in this project"
          />
          <label className="flex items-start gap-3 rounded-xl border border-border p-3 text-sm">
            <input
              className="mt-0.5 size-4 accent-primary"
              defaultChecked={project.sharedMemoryEnabled}
              name="sharedMemoryEnabled"
              type="checkbox"
            />
            <span>
              <span className="block font-medium">Shared project memory</span>
              <span className="text-muted-foreground">
                Let this project&apos;s conversations contribute context to one
                another. Disable it to keep each conversation separate.
              </span>
            </span>
          </label>
          <Button type="submit" variant="outline">
            Save settings
          </Button>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="font-medium">Conversations</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Only your private conversations can be added. Moving a conversation
          here removes it from its previous project.
        </p>
        {chats.some((chat) => !contained.has(chat.id)) ? (
          <form
            action={addProjectConversationAction}
            className="mt-4 flex flex-wrap gap-2"
          >
            <input name="projectId" type="hidden" value={project.id} />
            <select
              className="h-9 min-w-56 rounded-xl border border-border bg-background px-3 text-sm"
              name="conversationId"
            >
              {chats
                .filter((chat) => !contained.has(chat.id))
                .map((chat) => (
                  <option key={chat.id} value={chat.id}>
                    {chat.title || "New conversation"} · {chat.agentName}
                  </option>
                ))}
            </select>
            <Button type="submit" variant="outline">
              Add conversation
            </Button>
          </form>
        ) : null}
        {projectChats.length ? (
          <ul className="mt-4 space-y-2">
            {projectChats.map((chat) => (
              <li
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-3"
                key={chat.id}
              >
                <Link
                  className="min-w-0 flex-1 text-sm hover:text-primary"
                  href={`/workspace/workers/${chat.workerId}/conversations/${chat.id}`}
                >
                  {chat.title || "New conversation"}{" "}
                  <span className="text-muted-foreground">
                    · {chat.agentName}
                  </span>
                </Link>
                <form action={removeProjectConversationAction}>
                  <input name="projectId" type="hidden" value={project.id} />
                  <input name="conversationId" type="hidden" value={chat.id} />
                  <Button size="sm" type="submit" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Add a conversation to start organizing this project.
          </p>
        )}
      </section>
    </main>
  );
}

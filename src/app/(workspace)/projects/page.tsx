import Link from "next/link";

import { modeHref } from "@/agents/agent-kinds";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { ModeIcon } from "@/components/workspace/mode-icon";
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import {
  listProjectConversations,
  listProjects,
} from "@/projects/project-repository";

import { createProjectAction } from "./actions";

const CHAT_PREVIEW_LIMIT = 5;

export default async function ProjectsPage() {
  const { organizationId, user } = await requireWorkspaceSession();
  const owner = { organizationId, userId: user.id };
  const projects = await listProjects(owner);
  const projectChats = await Promise.all(
    projects.map((project) =>
      listProjectConversations({ ...owner, projectId: project.id }),
    ),
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        actions={<NewProjectDialog action={createProjectAction} />}
        description="Group your own conversations around a focused piece of work."
        eyebrow="Private projects"
        title="Projects"
      />

      {projects.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project, index) => {
            const chats = projectChats[index] ?? [];
            const preview = chats.slice(0, CHAT_PREVIEW_LIMIT);
            const remaining = chats.length - preview.length;
            return (
              <li key={project.id}>
                <Item
                  asChild
                  className="h-full flex-col items-stretch"
                  variant="outline"
                >
                  <div>
                    <Link className="block" href={`/projects/${project.id}`}>
                      <ItemContent>
                        <ItemTitle>{project.name}</ItemTitle>
                        <ItemDescription className="line-clamp-2">
                          {project.instructions ??
                            "No project instructions yet."}
                        </ItemDescription>
                      </ItemContent>
                    </Link>
                    {preview.length > 0 ? (
                      <ul className="mt-3 space-y-1 border-t pt-3">
                        {preview.map((chat) => (
                          <li key={chat.id}>
                            <Link
                              className="flex items-center gap-2 truncate text-sm text-muted-foreground hover:text-foreground hover:underline"
                              href={modeHref(chat.kind, chat.id)}
                            >
                              <ModeIcon
                                className="size-3.5 shrink-0"
                                kind={chat.kind}
                              />
                              <span className="truncate">
                                {chat.title ?? "New conversation"}
                              </span>
                            </Link>
                          </li>
                        ))}
                        {remaining > 0 ? (
                          <li>
                            <Link
                              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                              href={`/projects/${project.id}`}
                            >
                              +{remaining} more
                            </Link>
                          </li>
                        ) : null}
                      </ul>
                    ) : (
                      <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">
                        No conversations yet.
                      </p>
                    )}
                  </div>
                </Item>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No projects yet</EmptyTitle>
            <EmptyDescription>
              Create a project to organize conversations around a piece of work.
            </EmptyDescription>
          </EmptyHeader>
          <NewProjectDialog action={createProjectAction} />
        </Empty>
      )}
    </main>
  );
}

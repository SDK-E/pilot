import Link from "next/link";

import { modeHref } from "@/agents/agent-kinds";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";
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
        description="Group your own conversations around a focused piece of work."
        eyebrow="Private projects"
        title="Projects"
      />

      <Card>
        <form action={createProjectAction}>
          <CardHeader>
            <CardTitle>New project</CardTitle>
            <CardDescription>
              Instructions apply to every conversation in the project.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="project-name">Name</FieldLabel>
                <Input
                  id="project-name"
                  maxLength={100}
                  name="name"
                  placeholder="Project name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-instructions">
                  Instructions
                </FieldLabel>
                <Textarea
                  id="project-instructions"
                  maxLength={10_000}
                  name="instructions"
                  placeholder="Optional project instructions"
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="pt-4">
            <Button type="submit">Create project</Button>
          </CardFooter>
        </form>
      </Card>

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
        </Empty>
      )}
    </main>
  );
}

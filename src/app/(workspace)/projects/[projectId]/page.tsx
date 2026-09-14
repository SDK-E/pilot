import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { ProjectConversations } from "@/components/projects/project-conversations";
import { ProjectFiles } from "@/components/projects/project-files";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/workspace/page-header";
import { listConversations } from "@/conversations/conversation-repository";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listProjectFiles } from "@/projects/project-file-repository";
import {
  getProject,
  listProjectConversations,
} from "@/projects/project-repository";

import { updateProjectAction } from "../actions";

export default async function ProjectPage({
  params,
}: PageProps<"/projects/[projectId]">) {
  const { projectId } = await params;
  if (!z.uuid().safeParse(projectId).success) notFound();
  const { organizationId, user } = await requireWorkspaceSession();
  const owner = { organizationId, userId: user.id, projectId };
  const [project, projectChats, chats, files] = await Promise.all([
    getProject(owner),
    listProjectConversations(owner),
    listConversations({ organizationId, userId: user.id }),
    listProjectFiles(owner),
  ]);
  if (!project) notFound();

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-6">
      <PageHeader
        actions={<DeleteProjectButton projectId={project.id} />}
        eyebrow={
          <Link className="hover:text-foreground" href="/projects">
            Projects
          </Link>
        }
        title={project.name}
      />

      <Card>
        <form action={updateProjectAction}>
          <input name="projectId" type="hidden" value={project.id} />
          <CardHeader>
            <CardTitle>Project settings</CardTitle>
            <CardDescription>
              Project instructions apply to conversations in this project.
              Shared memory is opt-in and stays scoped to your private project
              chats.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="project-name">Name</FieldLabel>
                <Input
                  defaultValue={project.name}
                  id="project-name"
                  maxLength={100}
                  name="name"
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="project-instructions">
                  Instructions
                </FieldLabel>
                <Textarea
                  defaultValue={project.instructions ?? ""}
                  id="project-instructions"
                  maxLength={10_000}
                  name="instructions"
                  placeholder="Instructions for work in this project"
                />
              </Field>
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>Shared project memory</FieldTitle>
                  <FieldDescription>
                    Let this project&apos;s conversations contribute context to
                    one another. Off keeps each conversation separate.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  aria-label="Shared project memory"
                  defaultChecked={project.sharedMemoryEnabled}
                  name="sharedMemoryEnabled"
                />
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="pt-4">
            <Button type="submit" variant="outline">
              Save settings
            </Button>
          </CardFooter>
        </form>
      </Card>

      <ProjectFiles files={files} projectId={project.id} />
      <ProjectConversations
        candidates={chats}
        members={projectChats}
        projectId={project.id}
      />
    </main>
  );
}

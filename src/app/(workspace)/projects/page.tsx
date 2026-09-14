import Link from "next/link";

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
import { PageHeader } from "@/components/workspace/page-header";
import { requireWorkspaceSession } from "@/organizations/workspace-session";
import { listProjects } from "@/projects/project-repository";

import { createProjectAction } from "./actions";

export default async function ProjectsPage() {
  const { organizationId, user } = await requireWorkspaceSession();
  const projects = await listProjects({ organizationId, userId: user.id });

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
          {projects.map((project) => (
            <li key={project.id}>
              <Item asChild className="h-full" variant="outline">
                <Link href={`/projects/${project.id}`}>
                  <ItemContent>
                    <ItemTitle>{project.name}</ItemTitle>
                    <ItemDescription className="line-clamp-2">
                      {project.instructions ?? "No project instructions yet."}
                    </ItemDescription>
                  </ItemContent>
                </Link>
              </Item>
            </li>
          ))}
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

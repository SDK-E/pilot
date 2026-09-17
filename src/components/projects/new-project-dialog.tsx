"use client";

import { RiAddLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * The "create a project" form, behind a trigger instead of permanently
 * expanded above the project list — an empty list should read as an empty
 * state first, with creation one click away, the way ChatGPT/Claude
 * Projects work.
 */
export function NewProjectDialog({
  action,
}: {
  action: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <RiAddLine aria-hidden="true" />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={action}>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Instructions apply to every conversation in the project.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
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
          <DialogFooter>
            <Button type="submit">Create project</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

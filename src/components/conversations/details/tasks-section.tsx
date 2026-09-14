"use client";

import { RiAddLine, RiListCheck3 } from "@remixicon/react";
import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createConversationTaskAction,
  type ActionState,
} from "@/app/(workspace)/[mode]/[conversationId]/actions";
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
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { status: "idle" };

function CreateTaskDialog({
  conversationId,
  onCreated,
}: {
  conversationId: string;
  onCreated: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, isPending] = useActionState(
    createConversationTaskAction,
    initialState,
  );

  useEffect(() => {
    if (state.status !== "success") return;
    formRef.current?.reset();
    startTransition(() => {
      setIsOpen(false);
    });
    onCreated();
  }, [onCreated, state.status]);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <RiAddLine aria-hidden="true" /> Create task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create task</DialogTitle>
          <DialogDescription>
            Add a task to this chat to keep its intended outcome and status
            visible. Creating it does not start an external action.
          </DialogDescription>
        </DialogHeader>
        <form action={action} ref={formRef}>
          <input name="conversationId" type="hidden" value={conversationId} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="task-title">Task name</FieldLabel>
              <Input
                id="task-title"
                maxLength={200}
                name="title"
                placeholder="For example, compare three approaches"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="task-instructions">
                What should this task produce?
              </FieldLabel>
              <Textarea
                id="task-instructions"
                maxLength={10_000}
                name="instructions"
                placeholder="Describe the expected result and any useful constraints."
                required
                rows={4}
              />
            </Field>
            {state.status === "error" ? (
              <p aria-live="polite" className="text-xs text-destructive">
                {state.message}
              </p>
            ) : null}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button disabled={isPending} type="submit">
              <RiListCheck3 aria-hidden="true" />
              {isPending ? "Creating…" : "Create task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Tasks attached to this chat, with a dialog to add one.
 */
export function TasksSection({
  conversationId,
  tasks,
  onTaskCreated,
}: {
  conversationId: string;
  tasks: { id: string; title: string; status: string }[];
  onTaskCreated: () => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-medium">Tasks</h2>
        <CreateTaskDialog
          conversationId={conversationId}
          onCreated={onTaskCreated}
        />
      </div>
      {tasks.length > 0 ? (
        <ItemGroup>
          {tasks.map((task) => (
            <Item key={task.id} size="sm" variant="outline">
              <ItemContent>
                <ItemTitle>{task.title}</ItemTitle>
                <ItemDescription className="capitalize">
                  {task.status}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      ) : (
        <p className="text-xs text-muted-foreground">
          Create a task when you want its outcome and status to stay visible in
          this chat.
        </p>
      )}
    </section>
  );
}

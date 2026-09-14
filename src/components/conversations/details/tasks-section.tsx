"use client";

import { ListTodo, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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
          <Plus aria-hidden="true" className="size-3.5" /> Create task
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
        <form action={action} className="space-y-4" ref={formRef}>
          <input name="conversationId" type="hidden" value={conversationId} />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-title">
              Task name
            </label>
            <Input
              id="task-title"
              maxLength={200}
              name="title"
              placeholder="For example, compare three approaches"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="task-instructions">
              What should this task produce?
            </label>
            <Textarea
              className="min-h-28"
              id="task-instructions"
              maxLength={10_000}
              name="instructions"
              placeholder="Describe the expected result and any useful constraints."
              required
              rows={4}
            />
          </div>
          {state.status === "error" ? (
            <p aria-live="polite" className="text-sm text-destructive">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={isPending} type="submit">
              <ListTodo aria-hidden="true" />
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
    <section>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Tasks</h2>
        <CreateTaskDialog
          conversationId={conversationId}
          onCreated={onTaskCreated}
        />
      </div>
      {tasks.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {tasks.map((task) => (
            <li
              className="rounded-xl border border-border bg-card/60 px-3 py-2"
              key={task.id}
            >
              <p className="text-sm font-medium">{task.title}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">
                {task.status}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Create a task when you want its outcome and status to stay visible in
          this chat.
        </p>
      )}
    </section>
  );
}

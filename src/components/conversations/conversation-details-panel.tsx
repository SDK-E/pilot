"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ListTodo,
  Plus,
} from "lucide-react";
import {
  createConversationTaskAction,
  decideConversationApprovalAction,
  type CreateConversationTaskState,
  type DecideConversationApprovalState,
} from "@/app/workspace/conversation-actions";
import type { ActivityEventType } from "@/executions/activity-event";
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

const initialTaskState: CreateConversationTaskState = { status: "idle" };
const initialApprovalState: DecideConversationApprovalState = {
  status: "idle",
};

type ConversationDetailsPanelProps = {
  activities: Array<{ id: string; summary: string; type: ActivityEventType }>;
  agentId: string;
  conversationId: string;
  tasks: Array<{ id: string; title: string; status: string }>;
  approvals: Array<{ id: string; summary: string; status: string }>;
  scratchpad: string;
  onTaskCreated: () => void;
};

function activityIcon(type: ActivityEventType) {
  if (type === "execution.failed" || type === "tool.failed") {
    return (
      <CircleAlert
        aria-hidden="true"
        className="mt-0.5 size-3.5 text-destructive"
      />
    );
  }
  return (
    <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 text-primary" />
  );
}

export function ConversationDetailsPanel({
  activities,
  agentId,
  conversationId,
  tasks,
  approvals,
  scratchpad,
  onTaskCreated,
}: ConversationDetailsPanelProps) {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const taskFormRef = useRef<HTMLFormElement>(null);
  const [taskState, taskAction, pending] = useActionState(
    createConversationTaskAction,
    initialTaskState,
  );
  const [approvalState, approvalAction, approvalPending] = useActionState(
    decideConversationApprovalAction,
    initialApprovalState,
  );

  useEffect(() => {
    if (taskState.status === "success") {
      taskFormRef.current?.reset();
      startTransition(() => setTaskDialogOpen(false));
      onTaskCreated();
    }
  }, [onTaskCreated, taskState.status]);

  useEffect(() => {
    if (approvalState.status === "success") onTaskCreated();
  }, [approvalState.status, onTaskCreated]);

  return (
    <aside
      aria-label="Agent activity and chat controls"
      className="order-last min-h-0 w-full shrink-0 border-t border-border bg-sidebar/40 lg:order-none lg:w-80 lg:border-t-0 lg:border-l"
    >
      <div className="h-full space-y-5 overflow-y-auto p-4">
        <section>
          <h2 className="text-sm font-medium">Agent activity</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Verified events from Pilot while it works in this chat.
          </p>
          <details className="group mt-3 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
              <span>
                {activities.length
                  ? `${activities.length} events`
                  : "No activity yet"}
              </span>
              <ChevronRight
                aria-hidden="true"
                className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
              />
            </summary>
            {activities.length ? (
              <ol className="mt-3 space-y-3 border-l border-border pl-3">
                {activities.map((activity) => (
                  <li
                    className="flex gap-2 text-xs text-muted-foreground"
                    key={activity.id}
                  >
                    {activityIcon(activity.type)}
                    <span>{activity.summary}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                Activity appears here while Pilot uses a supported capability.
                Send a message to begin.
              </p>
            )}
          </details>
        </section>

        <section>
          <h2 className="text-sm font-medium">Working notes</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Context the agent chooses to save for this chat.
          </p>
          {scratchpad ? (
            <details className="group mt-3 rounded-xl border border-border bg-card/60 px-3 py-2 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-medium [&::-webkit-details-marker]:hidden">
                View saved notes
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
                />
              </summary>
              <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                {scratchpad}
              </pre>
            </details>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Working notes appear when the agent saves durable context.
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Tasks</h2>
            <Dialog onOpenChange={setTaskDialogOpen} open={taskDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost">
                  <Plus aria-hidden="true" className="size-3.5" /> Create task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create task</DialogTitle>
                  <DialogDescription>
                    Add a task to this chat to keep its intended outcome and
                    status visible. Creating it does not start an external
                    action.
                  </DialogDescription>
                </DialogHeader>
                <form
                  action={taskAction}
                  className="space-y-4"
                  ref={taskFormRef}
                >
                  <input name="workerId" type="hidden" value={agentId} />
                  <input
                    name="conversationId"
                    type="hidden"
                    value={conversationId}
                  />
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="conversation-task-title"
                    >
                      Task name
                    </label>
                    <Input
                      id="conversation-task-title"
                      maxLength={200}
                      name="title"
                      placeholder="For example, compare three approaches"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      className="text-sm font-medium"
                      htmlFor="conversation-task-instructions"
                    >
                      What should this task produce?
                    </label>
                    <Textarea
                      id="conversation-task-instructions"
                      className="min-h-28"
                      maxLength={10_000}
                      name="instructions"
                      placeholder="Describe the expected result and any useful constraints."
                      required
                      rows={4}
                    />
                  </div>
                  {taskState.status === "error" ? (
                    <p aria-live="polite" className="text-sm text-destructive">
                      {taskState.message}
                    </p>
                  ) : null}
                  <DialogFooter>
                    <Button disabled={pending} type="submit">
                      <ListTodo aria-hidden="true" />
                      {pending ? "Creating…" : "Create task"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          {tasks.length ? (
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
              Create a task when you want its outcome and status to stay visible
              in this chat.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium">Needs your approval</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Pilot pauses here before an action that needs your decision.
          </p>
          {approvals.length ? (
            <ul className="mt-3 space-y-2">
              {approvals.map((approval) => (
                <li
                  className="rounded-xl border border-border bg-card/60 px-3 py-2"
                  key={approval.id}
                >
                  <p className="text-sm font-medium">{approval.summary}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {approval.status}
                  </p>
                  {approval.status === "pending" ? (
                    <form action={approvalAction} className="mt-3 flex gap-2">
                      <input name="workerId" type="hidden" value={agentId} />
                      <input
                        name="conversationId"
                        type="hidden"
                        value={conversationId}
                      />
                      <input
                        name="approvalId"
                        type="hidden"
                        value={approval.id}
                      />
                      <Button
                        disabled={approvalPending}
                        name="decision"
                        size="sm"
                        type="submit"
                        value="approve"
                      >
                        Approve
                      </Button>
                      <Button
                        disabled={approvalPending}
                        name="decision"
                        size="sm"
                        type="submit"
                        value="reject"
                        variant="outline"
                      >
                        Decline
                      </Button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Approval cards appear only when an action needs your decision.
            </p>
          )}
          {approvalState.status === "error" ? (
            <p aria-live="polite" className="mt-2 text-xs text-destructive">
              {approvalState.message}
            </p>
          ) : null}
        </section>
      </div>
    </aside>
  );
}

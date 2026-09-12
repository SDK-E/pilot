"use client";

import { useActionState, useEffect } from "react";
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
  const [taskState, taskAction, pending] = useActionState(
    createConversationTaskAction,
    initialTaskState,
  );
  const [approvalState, approvalAction, approvalPending] = useActionState(
    decideConversationApprovalAction,
    initialApprovalState,
  );

  useEffect(() => {
    if (taskState.status === "success" || approvalState.status === "success") {
      onTaskCreated();
    }
  }, [approvalState.status, onTaskCreated, taskState.status]);

  return (
    <aside
      aria-label="Conversation details"
      className="order-last w-full shrink-0 border-t border-border bg-muted/20 lg:order-none lg:w-80 lg:border-t-0 lg:border-l"
    >
      <div className="h-full space-y-5 overflow-y-auto p-4">
        <section>
          <h2 className="text-sm font-medium">Activity</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Verified runtime events for this chat.
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
                Tool activity will appear here when a supported capability runs.
              </p>
            )}
          </details>
        </section>

        <section>
          <h2 className="text-sm font-medium">Scratchpad</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Private working notes the agent has saved for this chat.
          </p>
          {scratchpad ? (
            <pre className="mt-3 max-h-60 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-card/60 p-3 text-xs leading-5 text-muted-foreground">
              {scratchpad}
            </pre>
          ) : (
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              The agent has not saved any working notes yet.
            </p>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Tasks</h2>
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary [&::-webkit-details-marker]:hidden">
                <Plus aria-hidden="true" className="size-3.5" /> Add task
              </summary>
              <form
                action={taskAction}
                className="mt-3 space-y-2 rounded-xl border border-border bg-card/60 p-3"
              >
                <input name="workerId" type="hidden" value={agentId} />
                <input
                  name="conversationId"
                  type="hidden"
                  value={conversationId}
                />
                <Input
                  aria-label="Task title"
                  maxLength={200}
                  name="title"
                  placeholder="Task title"
                  required
                />
                <Textarea
                  aria-label="Task instructions"
                  className="min-h-20"
                  maxLength={10_000}
                  name="instructions"
                  placeholder="Expected outcome"
                  required
                  rows={3}
                />
                {taskState.status !== "idle" ? (
                  <p
                    aria-live="polite"
                    className={
                      taskState.status === "error"
                        ? "text-xs text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {taskState.message}
                  </p>
                ) : null}
                <Button disabled={pending} size="sm" type="submit">
                  <ListTodo aria-hidden="true" />{" "}
                  {pending ? "Adding…" : "Add task"}
                </Button>
              </form>
            </details>
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
              No tasks have been added to this chat.
            </p>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium">Approvals</h2>
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
              No approvals are waiting in this chat.
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

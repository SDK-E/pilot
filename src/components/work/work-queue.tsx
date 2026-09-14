import { Check, CircleDotDashed, MessageSquareMore, X } from "lucide-react";
import Link from "next/link";

import { modeHref } from "@/agents/agent-kinds";
import { updateTaskStatusAction } from "@/app/(workspace)/work/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface WorkTask {
  id: string;
  title: string;
  status: string;
  conversationId: string | null;
}

interface WorkApproval {
  id: string;
  summary: string;
  status: string;
  conversationId: string | null;
}

function statusVariant(status: string) {
  if (status === "failed" || status === "cancelled")
    return "destructive" as const;
  if (status === "completed") return "secondary" as const;
  return "outline" as const;
}

function TaskActions({ task }: { task: WorkTask }) {
  if (task.status !== "ready") return null;
  return (
    <>
      <form action={updateTaskStatusAction}>
        <input name="taskId" type="hidden" value={task.id} />
        <input name="status" type="hidden" value="completed" />
        <Button size="sm" type="submit" variant="secondary">
          <Check aria-hidden="true" /> Done
        </Button>
      </form>
      <form action={updateTaskStatusAction}>
        <input name="taskId" type="hidden" value={task.id} />
        <input name="status" type="hidden" value="cancelled" />
        <Button size="sm" type="submit" variant="ghost">
          <X aria-hidden="true" /> Cancel
        </Button>
      </form>
    </>
  );
}

/**
 * The Work queue: tasks created from conversations, and approvals waiting
 * on the user. Each row links back to the conversation it came from.
 */
export function WorkQueue({
  tasks,
  approvals,
}: {
  tasks: WorkTask[];
  approvals: WorkApproval[];
}) {
  const pending = approvals.filter((approval) => approval.status === "pending");
  return (
    <div className="space-y-8">
      {pending.length > 0 ? (
        <section aria-labelledby="approvals-heading">
          <h2 className="mb-3 text-lg font-medium" id="approvals-heading">
            Needs your approval
          </h2>
          <ul className="space-y-2">
            {pending.map((approval) => (
              <li
                className="flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 text-sm"
                key={approval.id}
              >
                <span>{approval.summary}</span>
                {approval.conversationId ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={modeHref("work", approval.conversationId)}>
                      Decide in conversation
                    </Link>
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="tasks-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium" id="tasks-heading">
            Your work
          </h2>
          <span className="text-sm text-muted-foreground">
            {tasks.length} total
          </span>
        </div>
        {tasks.length > 0 ? (
          <ul className="space-y-2">
            {tasks.map((task) => (
              <li
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-3"
                key={task.id}
              >
                <CircleDotDashed
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {task.title}
                </span>
                <Badge variant={statusVariant(task.status)}>
                  {task.status.replace("_", " ")}
                </Badge>
                {task.conversationId ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={modeHref("work", task.conversationId)}>
                      <MessageSquareMore aria-hidden="true" /> Open
                    </Link>
                  </Button>
                ) : null}
                <TaskActions task={task} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            No work yet. Describe a task above, or add one from any
            conversation.
          </p>
        )}
      </section>
    </div>
  );
}

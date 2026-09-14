import {
  RiChat3Line,
  RiCheckLine,
  RiCloseLine,
  RiTaskLine,
} from "@remixicon/react";
import Link from "next/link";

import { modeHref } from "@/agents/agent-kinds";
import { updateTaskStatusAction } from "@/app/(workspace)/work/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";

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
          <RiCheckLine aria-hidden="true" /> Done
        </Button>
      </form>
      <form action={updateTaskStatusAction}>
        <input name="taskId" type="hidden" value={task.id} />
        <input name="status" type="hidden" value="cancelled" />
        <Button size="sm" type="submit" variant="ghost">
          <RiCloseLine aria-hidden="true" /> Cancel
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
    <div className="space-y-6">
      {pending.length > 0 ? (
        <section aria-labelledby="approvals-heading" className="space-y-2">
          <h2 className="text-sm font-medium" id="approvals-heading">
            Needs your approval
          </h2>
          <ItemGroup>
            {pending.map((approval) => (
              <Item
                className="border-primary/40 bg-primary/5"
                key={approval.id}
                variant="outline"
              >
                <ItemContent>
                  <ItemTitle>{approval.summary}</ItemTitle>
                </ItemContent>
                {approval.conversationId ? (
                  <ItemActions>
                    <Button asChild size="sm" variant="outline">
                      <Link href={modeHref("work", approval.conversationId)}>
                        Decide in conversation
                      </Link>
                    </Button>
                  </ItemActions>
                ) : null}
              </Item>
            ))}
          </ItemGroup>
        </section>
      ) : null}

      <section aria-labelledby="tasks-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium" id="tasks-heading">
            Your work
          </h2>
          <span className="text-xs text-muted-foreground">
            {tasks.length} total
          </span>
        </div>
        {tasks.length > 0 ? (
          <ItemGroup>
            {tasks.map((task) => (
              <Item key={task.id} variant="outline">
                <ItemMedia variant="icon">
                  <RiTaskLine aria-hidden="true" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle className="truncate">{task.title}</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Badge variant={statusVariant(task.status)}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  {task.conversationId ? (
                    <Button asChild size="sm" variant="ghost">
                      <Link href={modeHref("work", task.conversationId)}>
                        <RiChat3Line aria-hidden="true" /> Open
                      </Link>
                    </Button>
                  ) : null}
                  <TaskActions task={task} />
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No work yet</EmptyTitle>
              <EmptyDescription>
                Describe a task above, or add one from any conversation.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </section>
    </div>
  );
}

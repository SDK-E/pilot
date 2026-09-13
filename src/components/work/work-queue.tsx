import Link from "next/link";
import { Check, CircleDotDashed, MessageSquareMore, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createTaskAction,
  updateTaskStatusAction,
} from "@/app/workspace/tasks/actions";

type WorkTask = {
  id: string;
  title: string;
  status: string;
  workerId: string | null;
  conversationId: string | null;
};

function statusVariant(status: string) {
  if (status === "failed" || status === "cancelled")
    return "destructive" as const;
  if (status === "completed") return "secondary" as const;
  return "outline" as const;
}

export function WorkQueue({ tasks }: { tasks: WorkTask[] }) {
  const active = tasks.filter(
    (task) => task.status === "ready" || task.status === "running",
  );
  const completed = tasks.filter((task) => task.status === "completed");

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Pilot Work</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
          Keep work moving
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Track work you create in Pilot. Tasks stay private to you and link
          back to the chat where they began.
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3" aria-label="Work summary">
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{active.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{completed.length}</p>
          </CardContent>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              All work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{tasks.length}</p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Plan a task</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTaskAction} className="grid gap-3">
            <input
              className="h-10 rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              name="title"
              placeholder="What needs to be done?"
              required
              maxLength={200}
            />
            <textarea
              className="min-h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              name="instructions"
              placeholder="Describe the outcome and any constraints."
              required
              maxLength={10_000}
            />
            <Button className="w-fit" type="submit">
              <CircleDotDashed aria-hidden="true" /> Add to Work
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="work-queue-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="work-queue-heading" className="text-lg font-medium">
            Your work
          </h2>
          <span className="text-sm text-muted-foreground">
            {tasks.length} total
          </span>
        </div>
        {tasks.length ? (
          <ul className="space-y-3">
            {tasks.map((task) => (
              <li key={task.id}>
                <Card size="sm">
                  <CardHeader className="gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CircleDotDashed
                        className="size-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <CardTitle className="truncate">{task.title}</CardTitle>
                    </div>
                    <Badge variant={statusVariant(task.status)}>
                      {task.status.replace("_", " ")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <>
                      {task.conversationId && task.workerId ? (
                        <Button asChild size="sm" variant="outline">
                          <Link
                            href={`/workspace/workers/${task.workerId}/conversations/${task.conversationId}`}
                          >
                            <MessageSquareMore aria-hidden="true" /> Open chat
                          </Link>
                        </Button>
                      ) : null}
                    </>
                    {task.status === "ready" ? (
                      <>
                        <form action={updateTaskStatusAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="completed"
                          />
                          <Button size="sm" variant="secondary" type="submit">
                            <Check aria-hidden="true" /> Complete
                          </Button>
                        </form>
                        <form action={updateTaskStatusAction}>
                          <input type="hidden" name="taskId" value={task.id} />
                          <input
                            type="hidden"
                            name="status"
                            value="cancelled"
                          />
                          <Button size="sm" variant="ghost" type="submit">
                            <X aria-hidden="true" /> Cancel
                          </Button>
                        </form>
                      </>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              No work yet. Add a task here or from a chat when you want to keep
              an outcome visible.
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

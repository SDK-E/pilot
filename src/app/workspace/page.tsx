import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { MessageSquareMore } from "lucide-react";
import { startDefaultConversationAction } from "./worker-actions";
import { Button } from "@/components/ui/button";

export default async function WorkspaceHome() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");

  return (
    <main className="flex min-h-[calc(100svh-4rem)] flex-1 flex-col items-center justify-center px-6 py-10">
      <section className="w-full max-w-2xl space-y-8 text-center">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
          <MessageSquareMore aria-hidden="true" className="size-6" />
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {organizationId ? "Your organization’s agent fleet" : "Pilot"}
          </p>
          <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">
            What would you like to work on?
          </h1>
          <p className="mx-auto max-w-xl text-muted-foreground">
            Start with your configurable Conversational agent. It will open a
            fresh, persistent conversation for this organization.
          </p>
        </div>
        <form action={startDefaultConversationAction}>
          <Button className="h-11 rounded-xl px-5" type="submit">
            Start a new chat
          </Button>
        </form>
      </section>
    </main>
  );
}

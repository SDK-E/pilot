import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { MessageSquareMore, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listOrganizationConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { DeleteConversationButton } from "@/components/conversations/delete-conversation-button";
import { RenameConversationForm } from "@/components/conversations/rename-conversation-form";

export default async function ChatsPage({
  searchParams,
}: {
  searchParams?: { query?: string };
}) {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) redirect("/workspace");
  const chats = await listOrganizationConversations(
    organizationId,
    user.id,
    searchParams?.query,
  );

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {membership.organizationName}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Chats</h1>
        </div>
        <Button asChild>
          <Link href="/workspace">
            <Plus aria-hidden="true" />
            New chat
          </Link>
        </Button>
      </header>
      <form action="?" method="get" className="flex gap-2">
        <Input
          name="query"
          placeholder="Search chats..."
          defaultValue={searchParams?.query ?? ""}
          aria-label="Search chats"
        />
        <Button type="submit" variant="outline">
          <Search aria-hidden="true" className="size-4" />
          Search
        </Button>
      </form>
      {chats.length === 0 ? (
        <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center">
          <div className="space-y-3">
            <MessageSquareMore className="mx-auto size-6 text-primary" />
            <p className="font-medium">No chats yet</p>
            <p className="text-sm text-muted-foreground">
              Start a conversation with an agent from New chat.
            </p>
          </div>
        </section>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-card/40">
          {chats.map((chat) => (
            <li key={chat.id}>
              <div className="flex items-center gap-2 px-2">
                <Link
                  className="block min-w-0 flex-1 space-y-1 px-4 py-4 transition-colors hover:bg-muted/70"
                  href={`/workspace/workers/${chat.workerId}/conversations/${chat.id}`}
                >
                  <p className="font-medium">
                    {chat.title ?? "New conversation"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {chat.agentName} · {chat.updatedAt.toLocaleString()}
                  </p>
                </Link>
                <DeleteConversationButton
                  workerId={chat.workerId}
                  conversationId={chat.id}
                />
                <RenameConversationForm
                  conversationId={chat.id}
                  title={chat.title ?? "New conversation"}
                  workerId={chat.workerId}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { MessageSquareMore } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listOrganizationConversations } from "@/conversations/conversation-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";

export default async function ChatsPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  if (!organizationId || !/^org_[a-zA-Z0-9]+$/.test(organizationId))
    redirect("/workspace");
  const membership = await getActiveOrganizationMembership(
    user.id,
    organizationId,
  );
  if (!membership) redirect("/workspace");
  const chats = await listOrganizationConversations(organizationId);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {membership.organizationName}
          </p>
          <h1 className="text-3xl font-medium tracking-tight">Chats</h1>
        </div>
        <Button asChild>
          <Link href="/workspace">New chat</Link>
        </Button>
      </header>
      {chats.length === 0 ? (
        <section className="grid min-h-64 place-items-center rounded-xl border border-dashed border-border p-8 text-center">
          <div className="space-y-3">
            <MessageSquareMore className="mx-auto size-6 text-primary" />
            <p className="font-medium">No chats yet</p>
            <p className="text-sm text-muted-foreground">
              Start a conversation with an agent from New chat.
            </p>
          </div>
        </section>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link
                className="block space-y-1 px-5 py-4 transition-colors hover:bg-muted/40"
                href={`/workspace/workers/${chat.workerId}/conversations/${chat.id}`}
              >
                <p className="font-medium">
                  {chat.title ?? "New conversation"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {chat.agentName} · {chat.updatedAt.toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

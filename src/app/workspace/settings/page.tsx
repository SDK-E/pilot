import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { isResearchAvailable } from "@/conversations/research-availability";
import { getUserPreferences } from "@/users/user-preference-repository";
import { getActiveOrganizationMembership } from "@/organizations/active-membership";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import { listWorkers } from "@/workers/worker-repository";
import {
  updateDefaultAgentAction,
  updateMessageShortcutAction,
} from "./actions";

export default async function SettingsPage() {
  const { user, organizationId } = await withAuth();
  if (!user) redirect("/sign-in");
  const hasOrganization = Boolean(
    organizationId && /^org_[a-zA-Z0-9]+$/.test(organizationId),
  );
  const membership = hasOrganization
    ? await getActiveOrganizationMembership(user.id, organizationId!)
    : undefined;
  const [preferences, organizationPreferences, agents] = await Promise.all([
    getUserPreferences(user.id),
    membership
      ? getOrganizationPreferences(organizationId!)
      : Promise.resolve({ defaultWorkerId: null }),
    membership ? listWorkers(organizationId!) : Promise.resolve([]),
  ]);

  const availableAgents = agents.filter((agent) =>
    isResearchAvailable(agent.baseAgentId),
  );

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header>
        <p className="text-sm text-muted-foreground">Personal settings</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          These controls apply to every chat you use in Pilot.
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="font-medium">Composer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how the Enter key behaves while writing a message.
        </p>
        <form action={updateMessageShortcutAction} className="mt-5 space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              defaultChecked={preferences.sendMessageShortcut === "mod_enter"}
              name="sendMessageShortcut"
              type="radio"
              value="mod_enter"
            />
            <span>
              <span className="block text-sm font-medium">
                Ctrl/⌘ + Enter sends
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Enter adds a new line.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              defaultChecked={preferences.sendMessageShortcut === "enter"}
              name="sendMessageShortcut"
              type="radio"
              value="enter"
            />
            <span>
              <span className="block text-sm font-medium">Enter sends</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Shift + Enter adds a new line.
              </span>
            </span>
          </label>
          <Button type="submit">Save composer preference</Button>
        </form>
      </section>
      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="font-medium">Organization default agent</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          New chats start with this agent selected. Each person can choose a
          different agent before sending their first message.
        </p>
        {membership && availableAgents.length ? (
          <form
            action={updateDefaultAgentAction}
            className="mt-4 flex flex-wrap gap-3"
          >
            <select
              className="h-9 min-w-52 rounded-xl border border-border bg-background px-3 text-sm"
              defaultValue={
                organizationPreferences.defaultWorkerId ??
                availableAgents[0]?.id
              }
              name="defaultWorkerId"
            >
              {availableAgents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline">
              Save default agent
            </Button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Create an agent before choosing an organization default.
          </p>
        )}
      </section>
      <section className="rounded-2xl border border-border bg-card/50 p-5">
        <h2 className="font-medium">Agents</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage the organization’s available agents and personas.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/workspace/fleet">Agent fleet</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/workspace/personas">Personas</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getUserPreferences } from "@/users/user-preference-repository";
import { updateMessageShortcutAction } from "./actions";

export default async function SettingsPage() {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const preferences = await getUserPreferences(user.id);

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

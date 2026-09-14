import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { listAgents } from "@/agents/agent-repository";
import {
  DefaultAgentSection,
  ModelPolicySection,
  settingsSectionClass,
  settingsSelectClass,
} from "@/components/settings/organization-sections";
import { Button } from "@/components/ui/button";
import { locales } from "@/i18n/locale-registry";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";
import { getUserPreferences } from "@/users/user-preference-repository";

import { updateLocaleAction, updateMessageShortcutAction } from "./actions";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

const ADMIN_ROLES = new Set(["owner", "admin"]);

function ShortcutOption({
  value,
  title,
  hint,
  checked,
}: {
  value: string;
  title: string;
  hint: string;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input
        defaultChecked={checked}
        name="sendMessageShortcut"
        type="radio"
        value={value}
      />
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

/**
 * The organization-level settings, only when the user has an active
 * membership. Model policy is limited to owners and admins.
 */
async function OrganizationSettings() {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return null;
  const [organization, agents] = await Promise.all([
    getOrganizationPreferences(session.organizationId),
    listAgents(session.organizationId),
  ]);
  const isAdmin = ADMIN_ROLES.has(session.membership.role.slug);
  return (
    <>
      <DefaultAgentSection
        agents={agents}
        defaultAgentId={organization.defaultWorkerId}
      />
      {isAdmin ? (
        <ModelPolicySection
          primaryModelId={organization.primaryModelId}
          retryEnabled={organization.retryEnabled}
        />
      ) : null}
    </>
  );
}

export default async function SettingsPage() {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const preferences = await getUserPreferences(user.id);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {user.email}. Your identity is managed through WorkOS.
        </p>
      </header>

      <section className={settingsSectionClass}>
        <h2 className="font-medium">Composer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how the Enter key behaves while writing a message.
        </p>
        <form action={updateMessageShortcutAction} className="mt-5 space-y-3">
          <ShortcutOption
            checked={preferences.sendMessageShortcut === "mod_enter"}
            hint="Enter adds a new line."
            title="Ctrl/⌘ + Enter sends"
            value="mod_enter"
          />
          <ShortcutOption
            checked={preferences.sendMessageShortcut === "enter"}
            hint="Shift + Enter adds a new line."
            title="Enter sends"
            value="enter"
          />
          <Button type="submit">Save composer preference</Button>
        </form>
      </section>

      <section className={settingsSectionClass}>
        <h2 className="font-medium">Language</h2>
        <form action={updateLocaleAction} className="mt-5 space-y-3">
          <select
            className={settingsSelectClass}
            defaultValue={preferences.uiLocale ?? ""}
            name="uiLocale"
          >
            <option value="">System default</option>
            {locales.map((locale) => (
              <option key={locale.tag} value={locale.tag}>
                {locale.nativeName}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline">
            Save language
          </Button>
        </form>
      </section>

      <OrganizationSettings />
    </main>
  );
}

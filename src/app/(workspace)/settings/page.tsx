import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { listAgents } from "@/agents/agent-repository";
import {
  DefaultAgentSection,
  ModelPolicySection,
} from "@/components/settings/organization-sections";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PageHeader } from "@/components/workspace/page-header";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
} from "@/organizations/workspace-session";
import { getUserPreferences } from "@/users/user-preference-repository";

import { updateMessageShortcutAction } from "./actions";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

const ADMIN_ROLES = new Set(["owner", "admin"]);

const SHORTCUTS = [
  {
    value: "mod_enter",
    title: "Ctrl/⌘ + Enter sends",
    hint: "Enter adds a new line.",
  },
  {
    value: "enter",
    title: "Enter sends",
    hint: "Shift + Enter adds a new line.",
  },
] as const;

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
    <main className="mx-auto w-full max-w-3xl space-y-6 p-6">
      <PageHeader
        description={`Signed in as ${user.email}. Your identity is managed through WorkOS.`}
        title="Settings"
      />

      <Card>
        <form action={updateMessageShortcutAction}>
          <CardHeader>
            <CardTitle>Composer</CardTitle>
            <CardDescription>
              Choose how the Enter key behaves while writing a message.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <RadioGroup
              defaultValue={preferences.sendMessageShortcut}
              name="sendMessageShortcut"
            >
              {SHORTCUTS.map((shortcut) => (
                <FieldLabel htmlFor={shortcut.value} key={shortcut.value}>
                  <Field orientation="horizontal">
                    <FieldContent>
                      <FieldTitle>{shortcut.title}</FieldTitle>
                      <FieldDescription>{shortcut.hint}</FieldDescription>
                    </FieldContent>
                    <RadioGroupItem
                      id={shortcut.value}
                      value={shortcut.value}
                    />
                  </Field>
                </FieldLabel>
              ))}
            </RadioGroup>
          </CardContent>
          <CardFooter className="pt-4">
            <Button type="submit">Save composer preference</Button>
          </CardFooter>
        </form>
      </Card>

      <OrganizationSettings />
    </main>
  );
}

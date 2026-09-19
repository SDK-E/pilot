import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { SettingsNav } from "@/components/settings/settings-nav";
import { WorkInstructionsSection } from "@/components/settings/work-instructions-section";
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
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/workspace/page-header";
import { getUserPreferences } from "@/users/user-preference-repository";

import { updateMessageShortcutAction } from "./actions";
import { loadOrganizationSettingsGroups } from "./load-organization-sections";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

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

function ComposerSection({
  sendMessageShortcut,
}: {
  sendMessageShortcut: string;
}) {
  return (
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
            defaultValue={sendMessageShortcut}
            key={sendMessageShortcut}
            name="sendMessageShortcut"
          >
            {SHORTCUTS.map((shortcut) => (
              <FieldLabel htmlFor={shortcut.value} key={shortcut.value}>
                <Field orientation="horizontal">
                  <FieldContent>
                    <FieldTitle>{shortcut.title}</FieldTitle>
                    <FieldDescription>{shortcut.hint}</FieldDescription>
                  </FieldContent>
                  <RadioGroupItem id={shortcut.value} value={shortcut.value} />
                </Field>
              </FieldLabel>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="pt-4">
          <Button type="submit">Save composer preference</Button>
          <FormSubmitToast message="Composer preference saved" />
        </CardFooter>
      </form>
    </Card>
  );
}

function buildSettingsSections(
  preferences: Awaited<ReturnType<typeof getUserPreferences>>,
  organizationGroups: Awaited<
    ReturnType<typeof loadOrganizationSettingsGroups>
  >,
) {
  return [
    {
      id: "general",
      label: "General",
      content: (
        <ComposerSection
          sendMessageShortcut={preferences.sendMessageShortcut}
        />
      ),
    },
    {
      id: "work",
      label: "Work",
      content: (
        <WorkInstructionsSection
          workInstructions={preferences.workInstructions}
        />
      ),
    },
    organizationGroups
      ? {
          id: "agents",
          label: "Agents & Capabilities",
          content: organizationGroups.agentsAndCapabilities,
        }
      : null,
    organizationGroups
      ? {
          id: "api-keys",
          label: "API Keys",
          content: organizationGroups.apiKeys,
        }
      : null,
    organizationGroups
      ? {
          id: "memory",
          label: "Memory & Instructions",
          content: organizationGroups.memory,
        }
      : null,
    organizationGroups?.connectors
      ? {
          id: "connectors",
          label: "Connectors",
          content: organizationGroups.connectors,
        }
      : null,
    organizationGroups?.organization
      ? {
          id: "organization",
          label: "Organization",
          content: organizationGroups.organization,
        }
      : null,
    organizationGroups?.dangerZone
      ? {
          id: "danger-zone",
          label: "Danger Zone",
          content: organizationGroups.dangerZone,
          isDangerZone: true,
        }
      : null,
  ].filter((section) => section !== null);
}

export default async function SettingsPage() {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const [preferences, organizationGroups] = await Promise.all([
    getUserPreferences(user.id),
    loadOrganizationSettingsGroups(),
  ]);

  const sections = buildSettingsSections(preferences, organizationGroups);

  return (
    <main className="mx-auto flex w-full max-w-4xl gap-8 p-6">
      <SettingsNav items={sections.map(({ id, label }) => ({ id, label }))} />
      <div className="min-w-0 flex-1 space-y-10">
        <PageHeader
          description={`Signed in as ${user.email}. Your identity is managed through WorkOS.`}
          title="Settings"
        />
        {sections.map((section) => (
          <section
            className="scroll-mt-(--header-height) space-y-6"
            id={section.id}
            key={section.id}
          >
            {section.isDangerZone ? (
              <>
                <Separator className="bg-destructive/30" />
                <h2 className="text-sm font-medium text-destructive">
                  {section.label}
                </h2>
              </>
            ) : null}
            {section.content}
          </section>
        ))}
      </div>
    </main>
  );
}

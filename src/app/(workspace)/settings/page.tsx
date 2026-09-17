import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";

import { listAgents } from "@/agents/agent-repository";
import { AgentCapabilitiesSection } from "@/components/settings/agent-capabilities-section";
import { ConnectorsSection } from "@/components/settings/connectors-section";
import { FormSubmitToast } from "@/components/settings/form-submit-toast";
import { ModelPolicySection } from "@/components/settings/model-policy-section";
import {
  DefaultAgentSection,
  DeleteWorkspaceSection,
  DomainVerificationSection,
  LocalDomainVerificationSection,
  WorkspaceNameSection,
} from "@/components/settings/organization-sections";
import { SettingsNav } from "@/components/settings/settings-nav";
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
import { listConnectorDefinitionsForSettings } from "@/connectors/connector-definition-repository";
import { listSelectableModels } from "@/model-gateways/model-gateway-repository";
import { listOrganizationDomains } from "@/organizations/local-domain-verification";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  type WorkspaceSession,
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

function buildAgentsAndCapabilitiesSection({
  agents,
  organization,
  isAdmin,
  availableModels,
}: {
  agents: { id: string; name: string }[];
  organization: Awaited<ReturnType<typeof getOrganizationPreferences>>;
  isAdmin: boolean;
  availableModels: Awaited<ReturnType<typeof listSelectableModels>>;
}) {
  return (
    <>
      <DefaultAgentSection
        agents={agents}
        defaultAgentId={organization.defaultWorkerId}
      />
      {isAdmin ? (
        <>
          <ModelPolicySection
            availableModels={availableModels}
            primaryModelId={organization.primaryModelId}
            retryEnabled={organization.retryEnabled}
          />
          <AgentCapabilitiesSection
            codeSandboxEnabled={organization.codeSandboxEnabled}
            webSearchEnabled={organization.webSearchEnabled}
          />
        </>
      ) : null}
    </>
  );
}

function buildOrganizationSection({
  session,
  domains,
  isAdmin,
}: {
  session: WorkspaceSession;
  domains: Awaited<ReturnType<typeof listOrganizationDomains>>;
  isAdmin: boolean;
}) {
  if (!isAdmin) return null;
  return (
    <>
      {session.kind === "local" ? (
        <WorkspaceNameSection
          organizationName={session.membership.organizationName}
        />
      ) : null}
      {session.kind === "workos" ? <DomainVerificationSection /> : null}
      {session.kind === "local" ? (
        <LocalDomainVerificationSection domains={domains} />
      ) : null}
    </>
  );
}

function buildDangerZoneSection({
  session,
  isOwner,
}: {
  session: WorkspaceSession;
  isOwner: boolean;
}) {
  if (!isOwner || session.kind !== "local") return null;
  return (
    <DeleteWorkspaceSection
      organizationId={session.organizationId}
      organizationName={session.membership.organizationName}
    />
  );
}

async function loadOrganizationSettingsGroups(): Promise<{
  agentsAndCapabilities: React.ReactNode;
  connectors: React.ReactNode;
  organization: React.ReactNode;
  dangerZone: React.ReactNode;
} | null> {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return null;
  const [organization, agents, domains, connectors, availableModels] =
    await Promise.all([
      getOrganizationPreferences(session.organizationId),
      listAgents(session.organizationId),
      session.kind === "local"
        ? listOrganizationDomains(session.organizationId)
        : Promise.resolve([]),
      listConnectorDefinitionsForSettings(session.organizationId),
      listSelectableModels(),
    ]);
  const isAdmin = ADMIN_ROLES.has(session.membership.role.slug);
  const isOwner = session.membership.role.slug === "owner";

  return {
    agentsAndCapabilities: buildAgentsAndCapabilitiesSection({
      agents,
      availableModels,
      isAdmin,
      organization,
    }),
    connectors: isAdmin ? <ConnectorsSection definitions={connectors} /> : null,
    organization: buildOrganizationSection({ domains, isAdmin, session }),
    dangerZone: buildDangerZoneSection({ isOwner, session }),
  };
}

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

export default async function SettingsPage() {
  const { user } = await withAuth();
  if (!user) redirect("/sign-in");
  const [preferences, organizationGroups] = await Promise.all([
    getUserPreferences(user.id),
    loadOrganizationSettingsGroups(),
  ]);

  const sections = [
    {
      id: "general",
      label: "General",
      content: (
        <ComposerSection
          sendMessageShortcut={preferences.sendMessageShortcut}
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

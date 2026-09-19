import { listAgents } from "@/agents/agent-repository";
import { listByokCredentials } from "@/byok/byok-repository";
import { AgentCapabilitiesSection } from "@/components/settings/agent-capabilities-section";
import { ByokSection } from "@/components/settings/byok-section";
import { ConnectorsSection } from "@/components/settings/connectors-section";
import { ModelPolicySection } from "@/components/settings/model-policy-section";
import {
  DefaultAgentSection,
  DeleteWorkspaceSection,
  DomainVerificationSection,
  LocalDomainVerificationSection,
  WorkspaceNameSection,
} from "@/components/settings/organization-sections";
import { UsageLimitSection } from "@/components/settings/usage-limit-section";
import {
  listConnectionSummaries,
  listConnectorDefinitionsForSettings,
} from "@/connectors/connector-definition-repository";
import { listSelectableModels } from "@/model-gateways/model-gateway-repository";
import { listCatalogProviders } from "@/models-catalog/models-catalog-repository";
import { listOrganizationDomains } from "@/organizations/local-domain-verification";
import { getOrganizationPreferences } from "@/organizations/organization-preference-repository";
import {
  getWorkspaceSession,
  isWorkspaceSession,
  type WorkspaceSession,
} from "@/organizations/workspace-session";
import { getUsageLimitPolicy } from "@/usage/usage-limit-repository";

import { loadMemorySection } from "./load-memory-sections";

const ADMIN_ROLES = new Set(["owner", "admin"]);

function buildAgentsAndCapabilitiesSection({
  agents,
  organization,
  isAdmin,
  availableModels,
  usageLimitPolicy,
}: {
  agents: { id: string; name: string }[];
  organization: Awaited<ReturnType<typeof getOrganizationPreferences>>;
  isAdmin: boolean;
  availableModels: Awaited<ReturnType<typeof listSelectableModels>>;
  usageLimitPolicy: Awaited<ReturnType<typeof getUsageLimitPolicy>>;
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
          <UsageLimitSection
            fiveHourTokenLimit={usageLimitPolicy.fiveHourTokenLimit}
            weeklyTokenLimit={usageLimitPolicy.weeklyTokenLimit}
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

export async function loadOrganizationSettingsGroups(): Promise<{
  agentsAndCapabilities: React.ReactNode;
  connectors: React.ReactNode;
  apiKeys: React.ReactNode;
  memory: React.ReactNode;
  organization: React.ReactNode;
  dangerZone: React.ReactNode;
} | null> {
  const session = await getWorkspaceSession();
  if (!isWorkspaceSession(session)) return null;
  const [
    organization,
    agents,
    domains,
    connectors,
    availableModels,
    usageLimitPolicy,
    byokCredentials,
    catalogProviders,
  ] = await Promise.all([
    getOrganizationPreferences(session.organizationId),
    listAgents(session.organizationId),
    session.kind === "local"
      ? listOrganizationDomains(session.organizationId)
      : Promise.resolve([]),
    listConnectorDefinitionsForSettings(session.organizationId),
    listSelectableModels(),
    getUsageLimitPolicy(session.organizationId),
    listByokCredentials(session.organizationId, session.user.id),
    listCatalogProviders(),
  ]);
  const isAdmin = ADMIN_ROLES.has(session.membership.role.slug);
  const isOwner = session.membership.role.slug === "owner";
  const connectionsByDefinitionId = await listConnectionSummaries(
    connectors.map((definition) => definition.id),
  );
  const memory = await loadMemorySection({
    organizationId: session.organizationId,
    userId: session.user.id,
    isAdmin,
    organization,
  });

  return {
    agentsAndCapabilities: buildAgentsAndCapabilitiesSection({
      agents,
      availableModels,
      isAdmin,
      organization,
      usageLimitPolicy,
    }),
    connectors: (
      <ConnectorsSection
        connectionsByDefinitionId={connectionsByDefinitionId}
        definitions={connectors}
        isAdmin={isAdmin}
        viewerWorkosUserId={session.user.id}
      />
    ),
    apiKeys: (
      <ByokSection credentials={byokCredentials} providers={catalogProviders} />
    ),
    memory,
    organization: buildOrganizationSection({ domains, isAdmin, session }),
    dangerZone: buildDangerZoneSection({ isOwner, session }),
  };
}

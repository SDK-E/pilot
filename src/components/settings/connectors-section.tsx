import { ConnectorProviderRow } from "@/components/settings/connector-provider-row";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { CONNECTOR_PROVIDERS } from "@/connectors/connector-providers";

import type { ConnectionSummary } from "@/connectors/connector-repository";

const PROVIDER_DESCRIPTIONS: Record<string, string> = {
  github: "Search and read issues, pull requests, and repositories.",
  google: "Search and read Google Drive files and Gmail messages.",
  slack: "List channels and read recent messages.",
  notion: "Search and read pages in your workspace.",
  linear: "Search issues in your workspace.",
  vercel: "List deployments and check project status.",
  monday: "Query boards and items.",
};

/**
 * Connector connections a member (or, for organization-shared connections,
 * an admin) manages from Settings. Read-only for the agents that use
 * them — see docs/decisions/0019-connectors.md.
 */
export function ConnectorsSection({
  isAdmin,
  personal,
  organization,
}: {
  isAdmin: boolean;
  personal: ConnectionSummary[];
  organization: ConnectionSummary[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connectors</CardTitle>
        <CardDescription>
          Connect your own accounts, or (as an admin) an account shared with
          everyone in the organization. Agents can only read through these — no
          connector action changes anything in the connected account.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <FieldGroup>
          {Object.values(CONNECTOR_PROVIDERS).map((provider) => (
            <ConnectorProviderRow
              description={PROVIDER_DESCRIPTIONS[provider.id] ?? ""}
              isAdmin={isAdmin}
              key={provider.id}
              organizationConnections={organization.filter(
                (connection) => connection.providerId === provider.id,
              )}
              personalConnections={personal.filter(
                (connection) => connection.providerId === provider.id,
              )}
              provider={provider}
            />
          ))}
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

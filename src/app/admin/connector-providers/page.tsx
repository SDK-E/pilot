import { ConnectorProvidersSection } from "@/components/platform/connector-provider-list";
import { PlatformSecretForm } from "@/components/platform/platform-secret-form";
import { PageHeader } from "@/components/workspace/page-header";
import {
  getConnectorProvider,
  listConnectorProviders,
} from "@/platform/connector-provider-repository";
import {
  GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY,
  hasPlatformSecret,
} from "@/platform/platform-secret-repository";

import type { ConnectorProviderForAdmin } from "@/platform/connector-provider-repository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connector providers" };

export default async function ConnectorProvidersPage() {
  const [summaries, hasWebhookSecret] = await Promise.all([
    listConnectorProviders(),
    hasPlatformSecret(GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY),
  ]);
  const details = await Promise.all(
    summaries.map((summary) => getConnectorProvider(summary.id)),
  );
  const providers = details.filter(
    (provider): provider is ConnectorProviderForAdmin => provider !== null,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        description="Platform-level connector providers — the full OAuth + REST config every organization can seed into its own connectors. An organization can still add its own custom connector with its own credentials from Settings regardless of what's configured here."
        title="Connector providers"
      />
      <ConnectorProvidersSection providers={providers} />
      <div className="space-y-3">
        <h2 className="text-sm font-medium">Other platform secrets</h2>
        <PlatformSecretForm
          configured={hasWebhookSecret}
          description="Verifies the X-Hub-Signature-256 header on Pilot's GitHub Marketplace listing webhook."
          label="GitHub Marketplace webhook secret"
        />
      </div>
    </div>
  );
}

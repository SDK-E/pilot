import { ConnectorProvidersSection } from "@/components/platform/connector-provider-list";
import { PlatformSecretForm } from "@/components/platform/platform-secret-form";
import { PageHeader } from "@/components/workspace/page-header";
import {
  getConnectorProvider,
  listConnectorProviders,
} from "@/platform/connector-provider-repository";
import {
  CRON_SECRET_KEY,
  GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY,
  hasPlatformSecret,
} from "@/platform/platform-secret-repository";

import type { ConnectorProviderForAdmin } from "@/platform/connector-provider-repository";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connector providers" };

/**
 * Every single-value platform secret rendered by the section below — add a
 * new entry here to put another one behind this same admin-managed,
 * no-deploy-required form instead of an env var. See ADR-0024.
 */
const PLATFORM_SECRET_FIELDS = [
  {
    key: GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY,
    label: "GitHub Marketplace webhook secret",
    description:
      "Verifies the X-Hub-Signature-256 header on Pilot's GitHub Marketplace listing webhook.",
  },
  {
    key: CRON_SECRET_KEY,
    label: "Cron scheduler secret",
    description:
      "Verifies the Authorization: Bearer header on requests to /api/cron/* from the external HTTP scheduler (cron-job.org). Must match the value saved in that scheduler's job configuration.",
  },
] as const;

export default async function ConnectorProvidersPage() {
  const [summaries, secretsConfigured] = await Promise.all([
    listConnectorProviders(),
    Promise.all(
      PLATFORM_SECRET_FIELDS.map((field) => hasPlatformSecret(field.key)),
    ),
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
        {PLATFORM_SECRET_FIELDS.map((field, index) => (
          <PlatformSecretForm
            key={field.key}
            configured={secretsConfigured[index] ?? false}
            description={field.description}
            label={field.label}
            secretKey={field.key}
          />
        ))}
      </div>
    </div>
  );
}

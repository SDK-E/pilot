import { ConnectorProviderForm } from "@/components/platform/connector-provider-form";
import { PlatformSecretForm } from "@/components/platform/platform-secret-form";
import { PageHeader } from "@/components/workspace/page-header";
import { CONNECTOR_SEEDS } from "@/connectors/connector-seed-definitions";
import { listConnectorProviderCredentials } from "@/platform/connector-provider-credential-repository";
import {
  GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY,
  hasPlatformSecret,
} from "@/platform/platform-secret-repository";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Connector providers" };

export default async function ConnectorProvidersPage() {
  const [credentials, hasWebhookSecret] = await Promise.all([
    listConnectorProviderCredentials(),
    hasPlatformSecret(GITHUB_MARKETPLACE_WEBHOOK_SECRET_KEY),
  ]);
  const clientIdBySlug = new Map(
    credentials.map((credential) => [credential.slug, credential.clientId]),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        description="Shared OAuth app credentials for Pilot's built-in connectors, and other platform-wide secrets. An organization can still add its own custom connector with its own credentials from Settings regardless of what's configured here."
        title="Connector providers"
      />
      <div className="space-y-3">
        {CONNECTOR_SEEDS.map((seed) => (
          <ConnectorProviderForm
            clientId={clientIdBySlug.get(seed.slug)}
            displayName={seed.displayName}
            icon={seed.icon}
            key={seed.slug}
            slug={seed.slug}
          />
        ))}
      </div>
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

import "server-only";

import { eq } from "drizzle-orm";

import { encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorDefinitions } from "@/db/schema";
import { listEnabledConnectorProviders } from "@/platform/connector-provider-repository";

/**
 * Seeds Pilot's platform-managed connectors for an organization that has
 * none yet — a one-time population of `connector_definitions`, not a
 * standing default. Once seeded, each row is an ordinary
 * admin-editable/removable connector; a provider a platform admin hasn't
 * enabled yet (Settings → Admin → Connector providers) is skipped
 * entirely, since an unusable connector would just clutter Settings.
 */
export async function seedDefaultConnectorDefinitions(input: {
  organizationId: string;
  createdByWorkosUserId: string;
}): Promise<void> {
  const [existing] = await db
    .select({ id: connectorDefinitions.id })
    .from(connectorDefinitions)
    .where(eq(connectorDefinitions.organizationId, input.organizationId))
    .limit(1);
  if (existing) return;

  const providers = await listEnabledConnectorProviders();
  if (providers.length === 0) return;

  await db.insert(connectorDefinitions).values(
    providers.map((provider) => {
      const secret = encryptToken(provider.clientSecret);
      return {
        organizationId: input.organizationId,
        slug: provider.slug,
        displayName: provider.displayName,
        icon: provider.icon,
        description: provider.description,
        authorizeUrl: provider.authorizeUrl,
        tokenUrl: provider.tokenUrl,
        scopes: provider.scopes,
        scopeDelimiter: provider.scopeDelimiter,
        clientId: provider.clientId,
        encryptedClientSecret: secret.ciphertext,
        clientSecretIv: secret.iv,
        clientSecretAuthTag: secret.authTag,
        accountIdentifierUrl: provider.accountIdentifierUrl,
        accountIdentifierField: provider.accountIdentifierField,
        actions: provider.actions,
        createdByWorkosUserId: input.createdByWorkosUserId,
      };
    }),
  );
}

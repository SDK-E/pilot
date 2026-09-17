import "server-only";

import { eq } from "drizzle-orm";

import { CONNECTOR_SEEDS } from "@/connectors/connector-seed-definitions";
import { encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorDefinitions } from "@/db/schema";
import { getConnectorProviderCredential } from "@/platform/connector-provider-credential-repository";

/**
 * Seeds Pilot's built-in connectors (GitHub, Slack, ...) for an
 * organization that has none yet — a one-time population of
 * `connector_definitions`, not a standing default. Once seeded, each row is
 * an ordinary admin-editable/removable connector; a seed a platform admin
 * hasn't configured credentials for yet (Settings → Admin → Connector
 * providers) is skipped entirely, since an unusable connector would just
 * clutter Settings.
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

  const seededCredentials = await Promise.all(
    CONNECTOR_SEEDS.map(async (seed) => {
      const credential = await getConnectorProviderCredential(seed.slug);
      return credential ? { seed, credential } : null;
    }),
  );
  const rows = seededCredentials.filter((row) => row !== null);
  if (rows.length === 0) return;

  await db.insert(connectorDefinitions).values(
    rows.map(({ seed, credential }) => {
      const secret = encryptToken(credential.clientSecret);
      return {
        organizationId: input.organizationId,
        slug: seed.slug,
        displayName: seed.displayName,
        icon: seed.icon,
        description: seed.description,
        authorizeUrl: seed.authorizeUrl,
        tokenUrl: seed.tokenUrl,
        scopes: seed.scopes,
        scopeDelimiter: seed.scopeDelimiter,
        clientId: credential.clientId,
        encryptedClientSecret: secret.ciphertext,
        clientSecretIv: secret.iv,
        clientSecretAuthTag: secret.authTag,
        accountIdentifierUrl: seed.accountIdentifierUrl,
        accountIdentifierField: seed.accountIdentifierField,
        actions: seed.actions,
        createdByWorkosUserId: input.createdByWorkosUserId,
      };
    }),
  );
}

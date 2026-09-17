import "server-only";

import { eq } from "drizzle-orm";

import { CONNECTOR_SEEDS } from "@/connectors/connector-seed-definitions";
import { encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorDefinitions } from "@/db/schema";

/**
 * Seeds Pilot's built-in connectors (GitHub, Slack, ...) for an
 * organization that has none yet — a one-time population of
 * `connector_definitions`, not a standing default. Once seeded, each row is
 * an ordinary admin-editable/removable connector; a seed whose client
 * id/secret env vars aren't configured is skipped entirely, since an
 * unusable connector would just clutter Settings.
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

  const rows = CONNECTOR_SEEDS.map((seed) => {
    const clientId = process.env[seed.clientIdEnvVar]?.trim();
    const clientSecret = process.env[seed.clientSecretEnvVar]?.trim();
    return clientId && clientSecret ? { seed, clientId, clientSecret } : null;
  }).filter((row) => row !== null);
  if (rows.length === 0) return;

  await db.insert(connectorDefinitions).values(
    rows.map(({ seed, clientId, clientSecret }) => {
      const secret = encryptToken(clientSecret);
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
        clientId,
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

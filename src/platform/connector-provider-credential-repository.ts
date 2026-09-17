import "server-only";

import { eq } from "drizzle-orm";

import { decryptToken, encryptToken } from "@/connectors/token-encryption";
import { db } from "@/db/client";
import { connectorProviderCredentials } from "@/db/schema";

export interface ConnectorProviderCredentialSummary {
  slug: string;
  clientId: string;
  updatedAt: Date;
}

export interface DecryptedConnectorProviderCredential {
  clientId: string;
  clientSecret: string;
}

/**
 * Never selects the encrypted secret columns — for the admin list view.
 */
export async function listConnectorProviderCredentials(): Promise<
  ConnectorProviderCredentialSummary[]
> {
  return db
    .select({
      slug: connectorProviderCredentials.slug,
      clientId: connectorProviderCredentials.clientId,
      updatedAt: connectorProviderCredentials.updatedAt,
    })
    .from(connectorProviderCredentials);
}

/**
 * Decrypted for one seed's actual use — server-only, never sent to a client.
 */
export async function getConnectorProviderCredential(
  slug: string,
): Promise<DecryptedConnectorProviderCredential | null> {
  const [row] = await db
    .select()
    .from(connectorProviderCredentials)
    .where(eq(connectorProviderCredentials.slug, slug))
    .limit(1);
  if (!row) return null;
  return {
    clientId: row.clientId,
    clientSecret: decryptToken({
      ciphertext: row.clientSecretCiphertext,
      iv: row.clientSecretIv,
      authTag: row.clientSecretAuthTag,
    }),
  };
}

/**
 * `clientSecret` is left unchanged when omitted — an admin editing a
 * provider's client id doesn't need to re-paste a secret they can no
 * longer see. A brand-new provider always requires one (enforced by the
 * caller's schema, since there is nothing yet to leave unchanged).
 */
export async function upsertConnectorProviderCredential(input: {
  slug: string;
  clientId: string;
  clientSecret: string | null;
  updatedByWorkosUserId: string;
}): Promise<void> {
  const secret = input.clientSecret ? encryptToken(input.clientSecret) : null;
  if (!secret) {
    const result = await db
      .update(connectorProviderCredentials)
      .set({
        clientId: input.clientId,
        updatedByWorkosUserId: input.updatedByWorkosUserId,
        updatedAt: new Date(),
      })
      .where(eq(connectorProviderCredentials.slug, input.slug))
      .returning({ id: connectorProviderCredentials.id });
    if (result.length === 0) {
      throw new Error(
        `No existing credential for "${input.slug}" — a client secret is required to create one.`,
      );
    }
    return;
  }
  await db
    .insert(connectorProviderCredentials)
    .values({
      slug: input.slug,
      clientId: input.clientId,
      clientSecretCiphertext: secret.ciphertext,
      clientSecretIv: secret.iv,
      clientSecretAuthTag: secret.authTag,
      updatedByWorkosUserId: input.updatedByWorkosUserId,
    })
    .onConflictDoUpdate({
      target: connectorProviderCredentials.slug,
      set: {
        clientId: input.clientId,
        clientSecretCiphertext: secret.ciphertext,
        clientSecretIv: secret.iv,
        clientSecretAuthTag: secret.authTag,
        updatedByWorkosUserId: input.updatedByWorkosUserId,
        updatedAt: new Date(),
      },
    });
}

export async function deleteConnectorProviderCredential(
  slug: string,
): Promise<void> {
  await db
    .delete(connectorProviderCredentials)
    .where(eq(connectorProviderCredentials.slug, slug));
}

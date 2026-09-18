import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { byokCredentials } from "@/db/schema";
import {
  decryptGatewaySecret,
  encryptGatewaySecret,
} from "@/model-gateways/gateway-secret";

const credentialColumns = {
  id: byokCredentials.id,
  organizationId: byokCredentials.organizationId,
  createdByWorkosUserId: byokCredentials.createdByWorkosUserId,
  label: byokCredentials.label,
  providerId: byokCredentials.providerId,
  baseUrl: byokCredentials.baseUrl,
  allowedModelIds: byokCredentials.allowedModelIds,
  enabled: byokCredentials.enabled,
  lastVerifiedAt: byokCredentials.lastVerifiedAt,
  createdAt: byokCredentials.createdAt,
  updatedAt: byokCredentials.updatedAt,
};

export type ByokCredential = Awaited<
  ReturnType<typeof listByokCredentials>
>[number];

/**
 * Only ever the caller's own credentials — this is personal-scope data, not
 * org-admin data, unlike `model_gateways`.
 */
export function listByokCredentials(
  organizationId: string,
  workosUserId: string,
) {
  return db
    .select(credentialColumns)
    .from(byokCredentials)
    .where(
      and(
        eq(byokCredentials.organizationId, organizationId),
        eq(byokCredentials.createdByWorkosUserId, workosUserId),
      ),
    )
    .orderBy(byokCredentials.createdAt);
}

/**
 * A credential's model ids for the composer "which model" picker, as a
 * stable `byok:<credentialId>:<modelId>` value — parallel to, and never
 * colliding with, `model_gateways`' own `gw:<gatewayId>:<modelId>` values.
 */
export interface SelectableByokModel {
  value: string;
  label: string;
  modelId: string;
}

export async function listSelectableByokModels(
  organizationId: string,
  workosUserId: string,
): Promise<SelectableByokModel[]> {
  const credentials = await listByokCredentials(organizationId, workosUserId);
  return credentials
    .filter((credential) => credential.enabled)
    .flatMap((credential) =>
      credential.allowedModelIds.map((modelId) => ({
        value: `byok:${credential.id}:${modelId}`,
        label: credential.label,
        modelId,
      })),
    );
}

function parseSelectableValue(
  value: string,
): { credentialId: string; modelId: string } | undefined {
  const match = /^byok:([0-9a-f-]{36}):(.+)$/i.exec(value);
  if (!match?.[1] || !match[2]) return undefined;
  return { credentialId: match[1], modelId: match[2] };
}

export interface ResolvedByokCredential {
  modelId: string;
  apiKey: string;
  baseUrl: string;
}

/**
 * Decrypts the credential's API key for exactly one call to pilot-ai, and
 * only when `workosUserId` is the credential's own owner — never cache or
 * log the result.
 */
export async function resolveByokCredential(
  selectableValue: string,
  workosUserId: string,
): Promise<ResolvedByokCredential | undefined> {
  const parsed = parseSelectableValue(selectableValue);
  if (!parsed) return undefined;
  const [credential] = await db
    .select({
      createdByWorkosUserId: byokCredentials.createdByWorkosUserId,
      baseUrl: byokCredentials.baseUrl,
      apiKeyCiphertext: byokCredentials.apiKeyCiphertext,
      apiKeyIv: byokCredentials.apiKeyIv,
      apiKeyAuthTag: byokCredentials.apiKeyAuthTag,
      allowedModelIds: byokCredentials.allowedModelIds,
      enabled: byokCredentials.enabled,
    })
    .from(byokCredentials)
    .where(eq(byokCredentials.id, parsed.credentialId))
    .limit(1);
  if (
    !credential?.enabled ||
    credential.createdByWorkosUserId !== workosUserId ||
    (credential.allowedModelIds.length > 0 &&
      !credential.allowedModelIds.includes(parsed.modelId))
  ) {
    return undefined;
  }
  const apiKey = decryptGatewaySecret({
    ciphertext: credential.apiKeyCiphertext,
    iv: credential.apiKeyIv,
    authTag: credential.apiKeyAuthTag,
  });
  return { modelId: parsed.modelId, apiKey, baseUrl: credential.baseUrl };
}

export interface ByokCredentialConfiguration {
  label: string;
  providerId: string;
  baseUrl: string;
  apiKey: string;
  allowedModelIds: string[];
  enabled: boolean;
}

export async function createByokCredential(
  organizationId: string,
  createdByWorkosUserId: string,
  credential: ByokCredentialConfiguration,
) {
  const secret = encryptGatewaySecret(credential.apiKey);
  const [created] = await db
    .insert(byokCredentials)
    .values({
      organizationId,
      createdByWorkosUserId,
      label: credential.label,
      providerId: credential.providerId,
      baseUrl: credential.baseUrl,
      allowedModelIds: credential.allowedModelIds,
      enabled: credential.enabled,
      apiKeyCiphertext: secret.ciphertext,
      apiKeyIv: secret.iv,
      apiKeyAuthTag: secret.authTag,
    })
    .returning({ id: byokCredentials.id, label: byokCredentials.label });
  return created;
}

/**
 * `apiKey` is optional on update: omit it to keep the stored key unchanged.
 * Ownership must be checked by the caller before calling this.
 */
export async function updateByokCredential(
  credentialId: string,
  credential: Omit<ByokCredentialConfiguration, "apiKey"> & {
    apiKey?: string;
  },
) {
  const secret = credential.apiKey
    ? encryptGatewaySecret(credential.apiKey)
    : undefined;
  const [updated] = await db
    .update(byokCredentials)
    .set({
      label: credential.label,
      providerId: credential.providerId,
      baseUrl: credential.baseUrl,
      allowedModelIds: credential.allowedModelIds,
      enabled: credential.enabled,
      updatedAt: new Date(),
      ...(secret && {
        apiKeyCiphertext: secret.ciphertext,
        apiKeyIv: secret.iv,
        apiKeyAuthTag: secret.authTag,
      }),
    })
    .where(eq(byokCredentials.id, credentialId))
    .returning({ id: byokCredentials.id, label: byokCredentials.label });
  return updated;
}

export async function deleteByokCredential(credentialId: string) {
  const [deleted] = await db
    .delete(byokCredentials)
    .where(eq(byokCredentials.id, credentialId))
    .returning({ id: byokCredentials.id });
  return deleted;
}

export async function getByokCredential(credentialId: string) {
  const [credential] = await db
    .select(credentialColumns)
    .from(byokCredentials)
    .where(eq(byokCredentials.id, credentialId))
    .limit(1);
  return credential;
}

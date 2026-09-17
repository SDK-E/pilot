import "server-only";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { modelGateways } from "@/db/schema";
import {
  decryptGatewaySecret,
  encryptGatewaySecret,
} from "@/model-gateways/gateway-secret";

const gatewayColumns = {
  id: modelGateways.id,
  name: modelGateways.name,
  baseUrl: modelGateways.baseUrl,
  allowedModelIds: modelGateways.allowedModelIds,
  enabled: modelGateways.enabled,
  createdAt: modelGateways.createdAt,
  updatedAt: modelGateways.updatedAt,
};

export type ModelGateway = Awaited<
  ReturnType<typeof listModelGateways>
>[number];

export function listModelGateways() {
  return db
    .select(gatewayColumns)
    .from(modelGateways)
    .orderBy(modelGateways.createdAt);
}

function listEnabledModelGateways() {
  return db
    .select(gatewayColumns)
    .from(modelGateways)
    .where(eq(modelGateways.enabled, true))
    .orderBy(modelGateways.createdAt);
}

/**
 * A gateway's model ids for the composer/organization "which model" picker,
 * as a stable `gw:<gatewayId>:<modelId>` value that resolves back to the
 * exact gateway (and so the exact credential) at request time — a bare
 * model id string alone doesn't say which gateway/key it belongs to.
 */
export interface SelectableModel {
  value: string;
  gatewayName: string;
  modelId: string;
}

export async function listSelectableModels(): Promise<SelectableModel[]> {
  const gateways = await listEnabledModelGateways();
  return gateways.flatMap((gateway) =>
    gateway.allowedModelIds.map((modelId) => ({
      value: `gw:${gateway.id}:${modelId}`,
      gatewayName: gateway.name,
      modelId,
    })),
  );
}

function parseSelectableModelValue(
  value: string,
): { gatewayId: string; modelId: string } | undefined {
  const match = /^gw:([0-9a-f-]{36}):(.+)$/i.exec(value);
  if (!match?.[1] || !match[2]) return undefined;
  return { gatewayId: match[1], modelId: match[2] };
}

export interface ResolvedGatewayCredential {
  modelId: string;
  apiKey: string;
  baseUrl: string;
}

/**
 * Decrypts the gateway's API key for exactly one call to pilot-ai. Never
 * cache or log the result — callers pass it straight into the runtime
 * request and let it go out of scope.
 */
export async function resolveGatewayCredential(
  selectableValue: string,
): Promise<ResolvedGatewayCredential | undefined> {
  const parsed = parseSelectableModelValue(selectableValue);
  if (!parsed) return undefined;
  const [gateway] = await db
    .select({
      baseUrl: modelGateways.baseUrl,
      apiKeyCiphertext: modelGateways.apiKeyCiphertext,
      apiKeyIv: modelGateways.apiKeyIv,
      apiKeyAuthTag: modelGateways.apiKeyAuthTag,
      allowedModelIds: modelGateways.allowedModelIds,
      enabled: modelGateways.enabled,
    })
    .from(modelGateways)
    .where(eq(modelGateways.id, parsed.gatewayId))
    .limit(1);
  if (!gateway?.enabled || !gateway.allowedModelIds.includes(parsed.modelId)) {
    return undefined;
  }
  const apiKey = decryptGatewaySecret({
    ciphertext: gateway.apiKeyCiphertext,
    iv: gateway.apiKeyIv,
    authTag: gateway.apiKeyAuthTag,
  });
  return { modelId: parsed.modelId, apiKey, baseUrl: gateway.baseUrl };
}

export interface ModelGatewayConfiguration {
  name: string;
  baseUrl: string;
  apiKey: string;
  allowedModelIds: string[];
  enabled: boolean;
}

export async function createModelGateway(
  createdByWorkosUserId: string,
  gateway: ModelGatewayConfiguration,
) {
  const secret = encryptGatewaySecret(gateway.apiKey);
  const [created] = await db
    .insert(modelGateways)
    .values({
      name: gateway.name,
      baseUrl: gateway.baseUrl,
      allowedModelIds: gateway.allowedModelIds,
      enabled: gateway.enabled,
      apiKeyCiphertext: secret.ciphertext,
      apiKeyIv: secret.iv,
      apiKeyAuthTag: secret.authTag,
      createdByWorkosUserId,
    })
    .returning({ id: modelGateways.id, name: modelGateways.name });
  return created;
}

/**
 * `apiKey` is optional on update: omit it to keep the stored key unchanged
 * rather than forcing a re-paste every time a name or model list changes.
 */
export async function updateModelGateway(
  gatewayId: string,
  gateway: Omit<ModelGatewayConfiguration, "apiKey"> & { apiKey?: string },
) {
  const secret = gateway.apiKey
    ? encryptGatewaySecret(gateway.apiKey)
    : undefined;
  const [updated] = await db
    .update(modelGateways)
    .set({
      name: gateway.name,
      baseUrl: gateway.baseUrl,
      allowedModelIds: gateway.allowedModelIds,
      enabled: gateway.enabled,
      updatedAt: new Date(),
      ...(secret && {
        apiKeyCiphertext: secret.ciphertext,
        apiKeyIv: secret.iv,
        apiKeyAuthTag: secret.authTag,
      }),
    })
    .where(eq(modelGateways.id, gatewayId))
    .returning({ id: modelGateways.id, name: modelGateways.name });
  return updated;
}

export async function deleteModelGateway(gatewayId: string) {
  const [deleted] = await db
    .delete(modelGateways)
    .where(eq(modelGateways.id, gatewayId))
    .returning({ id: modelGateways.id });
  return deleted;
}

export async function getModelGateway(gatewayId: string) {
  const [gateway] = await db
    .select(gatewayColumns)
    .from(modelGateways)
    .where(and(eq(modelGateways.id, gatewayId)))
    .limit(1);
  return gateway;
}

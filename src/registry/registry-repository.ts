import "server-only";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import type {
  CreateModelInput,
  CreateProviderInput,
  ModelDefinition,
  ProviderDefinition,
} from "./registry-types";

export async function createProvider(
  input: CreateProviderInput,
): Promise<ProviderDefinition> {
  // Implementation to be added when registry DB tables are created
  const now = new Date();
  return {
    id: `prov_${input.organizationId}_${input.providerKey}`,
    organizationId: input.organizationId,
    providerKey: input.providerKey,
    adapterKey: input.adapterKey,
    status: "active",
    connectionId: input.connectionId,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getProvider(
  providerId: string,
): Promise<ProviderDefinition | undefined> {
  // Placeholder: requires registry_providers table in DB
  return undefined;
}

export async function listProviders(organizationId: string) {
  // Placeholder: requires registry_providers table in DB
  return [];
}

export async function getModelDefinition(
  modelId: string,
): Promise<ModelDefinition | undefined> {
  // Placeholder: requires registry_models table in DB
  return undefined;
}

export async function listModelDefinitions(organizationId: string) {
  // Placeholder: requires registry_models table in DB
  return [];
}

export async function createModel(
  input: CreateModelInput,
): Promise<ModelDefinition> {
  const now = new Date();
  return {
    id: `mdl_${input.organizationId}_${input.modelId}`,
    organizationId: input.organizationId,
    modelId: input.modelId,
    providerId: input.providerId,
    adapterKey: input.adapterKey,
    providerModelId: input.providerModelId,
    modalities: input.modalities,
    contextWindow: input.contextWindow,
    outputLimits: { maxTokens: null, maxCompletionTokens: null },
    structuredOutput: input.structuredOutput,
    toolCalling: input.toolCalling,
    streaming: input.streaming,
    locales: input.locales,
    region: input.region,
    status: "active",
    version: input.version,
    createdAt: now,
    updatedAt: now,
  };
}

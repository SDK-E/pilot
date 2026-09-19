import "server-only";

import { sql } from "drizzle-orm";

import { db } from "@/db/client";
import { catalogModels, catalogProviders } from "@/db/schema";

const MODELS_DEV_CATALOG_URL = "https://models.dev/api.json";
const MODEL_UPSERT_BATCH_SIZE = 200;

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string")
    : [];
}

function isTrue(value: unknown): boolean {
  return value === true;
}

function asInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined;
}

function asCost(value: unknown): string | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : undefined;
}

function asModalities(
  value: unknown,
): { input: string[]; output: string[] } | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const record = value as Record<string, unknown>;
  return {
    input: asStringArray(record.input),
    output: asStringArray(record.output),
  };
}

interface ParsedProvider {
  id: string;
  name: string;
  apiBaseUrl?: string;
  npmPackage?: string;
  docsUrl?: string;
  envVarNames: string[];
  raw: unknown;
}

interface ParsedModel {
  id: string;
  providerId: string;
  displayName: string;
  family?: string;
  attachment: boolean;
  reasoning: boolean;
  toolCall: boolean;
  contextLimit?: number;
  outputLimit?: number;
  inputCostPerMillion?: string;
  outputCostPerMillion?: string;
  modalities?: { input: string[]; output: string[] };
  raw: unknown;
}

function parseModel(
  providerId: string,
  modelId: string,
  raw: unknown,
): ParsedModel | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  const limit =
    typeof record.limit === "object" && record.limit !== null
      ? (record.limit as Record<string, unknown>)
      : {};
  const cost =
    typeof record.cost === "object" && record.cost !== null
      ? (record.cost as Record<string, unknown>)
      : {};
  return {
    id: `${providerId}/${modelId}`,
    providerId,
    displayName: asString(record.name) ?? modelId,
    family: asString(record.family),
    attachment: isTrue(record.attachment),
    reasoning: isTrue(record.reasoning),
    toolCall: isTrue(record.tool_call),
    contextLimit: asInteger(limit.context),
    outputLimit: asInteger(limit.output),
    inputCostPerMillion: asCost(cost.input),
    outputCostPerMillion: asCost(cost.output),
    modalities: asModalities(record.modalities),
    raw,
  };
}

function parseProvider(
  providerId: string,
  raw: unknown,
): { provider: ParsedProvider; models: ParsedModel[] } | undefined {
  if (typeof raw !== "object" || raw === null) return undefined;
  const record = raw as Record<string, unknown>;
  const provider: ParsedProvider = {
    id: providerId,
    name: asString(record.name) ?? providerId,
    apiBaseUrl: asString(record.api),
    npmPackage: asString(record.npm),
    docsUrl: asString(record.doc),
    envVarNames: asStringArray(record.env),
    raw,
  };
  const rawModels =
    typeof record.models === "object" && record.models !== null
      ? (record.models as Record<string, unknown>)
      : {};
  const models = Object.entries(rawModels)
    .map(([modelId, modelRaw]) => parseModel(providerId, modelId, modelRaw))
    .filter((model): model is ParsedModel => model !== undefined);
  return { provider, models };
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export interface ModelsCatalogSyncResult {
  providerCount: number;
  modelCount: number;
}

/**
 * Mirrors models.dev's public provider/model catalog into
 * `catalog_providers`/`catalog_models`. A model that disappears from the
 * upstream response is left in place with its old `syncedAt` rather than
 * deleted — a hard delete could silently break a `byok_credentials` or
 * `model_gateways` row's `allowedModelIds` reference to it.
 */
export async function syncModelsCatalog(): Promise<ModelsCatalogSyncResult> {
  const response = await fetch(MODELS_DEV_CATALOG_URL);
  if (!response.ok) {
    throw new Error(`models.dev returned ${String(response.status)}.`);
  }
  const payload = (await response.json()) as Record<string, unknown>;
  const syncedAt = new Date();

  const parsed = Object.entries(payload)
    .map(([providerId, raw]) => parseProvider(providerId, raw))
    .filter(
      (item): item is { provider: ParsedProvider; models: ParsedModel[] } =>
        item !== undefined,
    );

  const providers = parsed.map(({ provider }) => ({ ...provider, syncedAt }));
  const models = parsed.flatMap(({ models: providerModels }) =>
    providerModels.map((model) => ({ ...model, syncedAt })),
  );

  if (providers.length > 0) {
    await db
      .insert(catalogProviders)
      .values(providers)
      .onConflictDoUpdate({
        target: catalogProviders.id,
        set: {
          name: sql`excluded.name`,
          apiBaseUrl: sql`excluded.api_base_url`,
          npmPackage: sql`excluded.npm_package`,
          docsUrl: sql`excluded.docs_url`,
          envVarNames: sql`excluded.env_var_names`,
          raw: sql`excluded.raw`,
          syncedAt: sql`excluded.synced_at`,
        },
      });
  }

  for (const batch of chunk(models, MODEL_UPSERT_BATCH_SIZE)) {
    await db
      .insert(catalogModels)
      .values(batch)
      .onConflictDoUpdate({
        target: catalogModels.id,
        set: {
          providerId: sql`excluded.provider_id`,
          displayName: sql`excluded.display_name`,
          family: sql`excluded.family`,
          attachment: sql`excluded.attachment`,
          reasoning: sql`excluded.reasoning`,
          toolCall: sql`excluded.tool_call`,
          contextLimit: sql`excluded.context_limit`,
          outputLimit: sql`excluded.output_limit`,
          inputCostPerMillion: sql`excluded.input_cost_per_million`,
          outputCostPerMillion: sql`excluded.output_cost_per_million`,
          modalities: sql`excluded.modalities`,
          raw: sql`excluded.raw`,
          syncedAt: sql`excluded.synced_at`,
        },
      });
  }

  return { providerCount: providers.length, modelCount: models.length };
}

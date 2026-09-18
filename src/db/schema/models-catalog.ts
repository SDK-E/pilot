/**
 * A read-only mirror of models.dev's public provider/model catalog
 * (https://models.dev/api.json), refreshed on a schedule
 * (src/models-catalog/sync-models-catalog.ts). Never hand-edited — an admin
 * curates which of these a `model_gateways` or `byok_credentials` row may
 * actually serve via that row's own `allowedModelIds`, not by changing rows
 * here.
 */
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const catalogProviders = pgTable("catalog_providers", {
  // models.dev's own provider slug, e.g. "anthropic" — stable across syncs.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  apiBaseUrl: text("api_base_url"),
  npmPackage: text("npm_package"),
  docsUrl: text("docs_url"),
  envVarNames: jsonb("env_var_names").$type<string[]>().notNull().default([]),
  // The full upstream provider object, so a field this table doesn't model
  // explicitly is still available without a migration.
  raw: jsonb("raw").notNull(),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
});

export const catalogModels = pgTable(
  "catalog_models",
  {
    // "<providerId>/<modelId>", models.dev's own stable id for this model.
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => catalogProviders.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    family: text("family"),
    attachment: boolean("attachment").notNull().default(false),
    reasoning: boolean("reasoning").notNull().default(false),
    toolCall: boolean("tool_call").notNull().default(false),
    contextLimit: integer("context_limit"),
    outputLimit: integer("output_limit"),
    inputCostPerMillion: numeric("input_cost_per_million"),
    outputCostPerMillion: numeric("output_cost_per_million"),
    modalities: jsonb("modalities").$type<{
      input: string[];
      output: string[];
    }>(),
    raw: jsonb("raw").notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("catalog_models_provider_id_index").on(table.providerId),
  ],
);

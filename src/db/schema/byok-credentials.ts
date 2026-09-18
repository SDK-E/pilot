/**
 * A user's own API key for an AI provider, usable for a conversation turn
 * either by explicit choice ("use my own key") or as an automatic fallback
 * once the user's platform usage allowance is exhausted
 * (src/conversations/model-plan.ts). Personal-scope, unlike `model_gateways`
 * (platform-admin-managed): only the owning user may read, use, edit, or
 * delete their own row.
 */
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { catalogProviders } from "./models-catalog";
import { organizations } from "./organizations";

export const byokCredentials = pgTable(
  "byok_credentials",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    label: text("label").notNull(),
    providerId: text("provider_id")
      .notNull()
      .references(() => catalogProviders.id),
    baseUrl: text("base_url").notNull(),
    apiKeyCiphertext: text("api_key_ciphertext").notNull(),
    apiKeyIv: text("api_key_iv").notNull(),
    apiKeyAuthTag: text("api_key_auth_tag").notNull(),
    // Subset of the provider's models this credential may serve; empty means
    // every model the provider's catalog entry lists.
    allowedModelIds: jsonb("allowed_model_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    enabled: boolean("enabled").notNull().default(true),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("byok_credentials_user_index").on(
      table.organizationId,
      table.createdByWorkosUserId,
    ),
    unique("byok_credentials_user_label_unique").on(
      table.createdByWorkosUserId,
      table.label,
    ),
  ],
);

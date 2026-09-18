/**
 * Platform-level administration: who operates Pilot itself, across every
 * organization, and the model gateways Pilot AI is allowed to call.
 * Unrelated to an organization's own owner/admin roles (`members.roleSlug`),
 * which only ever govern that one organization.
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

import type { ConnectorDefinitionAction } from "./connector-definitions";

export const platformAdmins = pgTable(
  "platform_admins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workosUserId: text("workos_user_id").notNull(),
    email: text("email").notNull(),
    role: text("role").$type<"superadmin" | "admin">().notNull(),
    addedByWorkosUserId: text("added_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("platform_admins_workos_user_id_unique").on(table.workosUserId),
  ],
);

export const modelGateways = pgTable(
  "model_gateways",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    baseUrl: text("base_url").notNull(),
    apiKeyCiphertext: text("api_key_ciphertext").notNull(),
    apiKeyIv: text("api_key_iv").notNull(),
    apiKeyAuthTag: text("api_key_auth_tag").notNull(),
    // Model ids this gateway may serve, curated by a platform admin rather
    // than exposing a provider's entire catalog to every organization.
    allowedModelIds: jsonb("allowed_model_ids")
      .$type<string[]>()
      .notNull()
      .default([]),
    enabled: boolean("enabled").notNull().default(true),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("model_gateways_name_unique").on(table.name),
    index("model_gateways_enabled_index").on(table.enabled),
  ],
);

/**
 * A platform-level connector provider: the full config for a connector
 * every organization can seed into its own `connector_definitions`
 * (`src/connectors/connector-seed.ts`), platform admin-managed from
 * Settings so adding, editing, or removing one needs no deploy. Mirrors
 * `connector_definitions`' own shape minus the per-org connection state
 * (no account identifier, tokens, or connection status — none of that
 * belongs at the platform level).
 */
export const connectorProviders = pgTable(
  "connector_providers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    /**
    A single emoji shown next to the provider in the admin UI.
    */
    icon: text("icon"),
    description: text("description").notNull().default(""),
    authorizeUrl: text("authorize_url").notNull(),
    tokenUrl: text("token_url").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    scopeDelimiter: text("scope_delimiter").notNull().default(" "),
    clientId: text("client_id").notNull(),
    clientSecretCiphertext: text("client_secret_ciphertext").notNull(),
    clientSecretIv: text("client_secret_iv").notNull(),
    clientSecretAuthTag: text("client_secret_auth_tag").notNull(),
    accountIdentifierUrl: text("account_identifier_url"),
    accountIdentifierField: text("account_identifier_field"),
    actions: jsonb("actions")
      .$type<ConnectorDefinitionAction[]>()
      .notNull()
      .default([]),
    enabled: boolean("enabled").notNull().default(true),
    updatedByWorkosUserId: text("updated_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [unique("connector_providers_slug_unique").on(table.slug)],
);

/**
 * Single-value platform secrets that aren't tied to a connector provider or
 * model gateway — e.g. the GitHub Marketplace webhook secret. One row per
 * `key`, admin-managed from Settings.
 */
export const platformSecrets = pgTable("platform_secrets", {
  key: text("key").primaryKey(),
  valueCiphertext: text("value_ciphertext").notNull(),
  valueIv: text("value_iv").notNull(),
  valueAuthTag: text("value_auth_tag").notNull(),
  updatedByWorkosUserId: text("updated_by_workos_user_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

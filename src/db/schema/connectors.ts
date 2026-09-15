/**
 * OAuth connections to third-party providers (GitHub, Google, Slack, Notion,
 * Linear, Vercel, Monday), scoped either to one member or shared across the
 * organization. See docs/decisions/0019-connectors.md.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

import type { ConnectorProviderId } from "@/connectors/connector-providers";

export const connectorConnections = pgTable(
  "connector_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /**
     * "organization" connections are visible to every member; "user"
     * connections are private to `ownerWorkosUserId`. The pairing invariant
     * (userId set iff scope is "user") is enforced in the repository layer,
     * not by a DB CHECK constraint, matching this schema tree's convention.
     */
    ownerScope: text("owner_scope").$type<"organization" | "user">().notNull(),
    ownerWorkosUserId: text("owner_workos_user_id"),
    providerId: text("provider_id").$type<ConnectorProviderId>().notNull(),
    label: text("label").notNull(),
    accountIdentifier: text("account_identifier").notNull(),
    encryptedAccessToken: text("encrypted_access_token").notNull(),
    accessTokenIv: text("access_token_iv").notNull(),
    accessTokenAuthTag: text("access_token_auth_tag").notNull(),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    refreshTokenIv: text("refresh_token_iv"),
    refreshTokenAuthTag: text("refresh_token_auth_tag"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    grantedScopes: jsonb("granted_scopes").$type<string[]>().notNull().default([]),
    status: text("status")
      .$type<"active" | "revoked" | "error">()
      .notNull()
      .default("active"),
    isDefault: boolean("is_default").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastErrorMessage: text("last_error_message"),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("connector_connections_org_provider_idx").on(
      table.organizationId,
      table.providerId,
    ),
    index("connector_connections_org_user_provider_idx").on(
      table.organizationId,
      table.ownerWorkosUserId,
      table.providerId,
    ),
    uniqueIndex("connector_connections_org_default_unique")
      .on(table.organizationId, table.providerId)
      .where(
        sql`${table.status} = 'active' AND ${table.isDefault} = true AND ${table.ownerScope} = 'organization'`,
      ),
    uniqueIndex("connector_connections_user_default_unique")
      .on(table.organizationId, table.ownerWorkosUserId, table.providerId)
      .where(
        sql`${table.status} = 'active' AND ${table.isDefault} = true AND ${table.ownerScope} = 'user'`,
      ),
  ],
);

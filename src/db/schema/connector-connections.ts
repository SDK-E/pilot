/**
 * A connector definition's OAuth connection state — the encrypted tokens
 * plus everything that comes with them. A definition can have at most one
 * `"organization"`-scope row (the shared connection every member's turns
 * use by default) and any number of `"personal"`-scope rows, one per owning
 * member, when the definition's `allowPersonalConnections` is on. Separate
 * from `connector_definitions` (config only) because the two have
 * different cardinality and ownership shapes, the same reasoning ADR-0024
 * used to split `platform_secrets` off `connector_providers`.
 */
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { connectorDefinitions } from "./connector-definitions";
import { organizations } from "./organizations";

export const connectorConnections = pgTable(
  "connector_connections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectorDefinitionId: uuid("connector_definition_id")
      .notNull()
      .references(() => connectorDefinitions.id, { onDelete: "cascade" }),
    // Denormalized from the definition so every connection query can filter
    // by org without a join — matches how `executions.organizationId` sits
    // alongside `conversationId` for the same reason.
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scope: text("scope").$type<"organization" | "personal">().notNull(),
    // Set only for a "personal" row; null for "organization".
    ownerWorkosUserId: text("owner_workos_user_id"),
    accountIdentifier: text("account_identifier"),
    encryptedAccessToken: text("encrypted_access_token"),
    accessTokenIv: text("access_token_iv"),
    accessTokenAuthTag: text("access_token_auth_tag"),
    encryptedRefreshToken: text("encrypted_refresh_token"),
    refreshTokenIv: text("refresh_token_iv"),
    refreshTokenAuthTag: text("refresh_token_auth_tag"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    grantedScopes: jsonb("granted_scopes")
      .$type<string[]>()
      .notNull()
      .default([]),
    connectionStatus: text("connection_status")
      .$type<"not_connected" | "active" | "error">()
      .notNull()
      .default("not_connected"),
    lastErrorMessage: text("last_error_message"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("connector_connections_definition_index").on(
      table.connectorDefinitionId,
    ),
    uniqueIndex("connector_connections_org_scope_unique")
      .on(table.connectorDefinitionId)
      .where(sql`${table.scope} = 'organization'`),
    uniqueIndex("connector_connections_personal_scope_unique")
      .on(table.connectorDefinitionId, table.ownerWorkosUserId)
      .where(sql`${table.scope} = 'personal'`),
  ],
);

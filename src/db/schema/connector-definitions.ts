/**
 * One dynamic connector: a generic OAuth2 + REST integration, whether
 * seeded by Pilot itself (GitHub, Slack, ...) or added by an admin from
 * Settings — both are just rows here, driven by the same engine
 * (`src/connectors/base-connector.ts`). This table holds only a
 * connector's *configuration*; its OAuth connection state (possibly more
 * than one — an org-wide connection and/or any number of personal ones,
 * see `allowPersonalConnections`) lives in `connector_connections`.
 */
import {
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

/**
One admin-declared action a custom connector's tool can call.
*/
export interface ConnectorDefinitionAction {
  id: string;
  label: string;
  description: string;
  method: "GET" | "POST";
  /**
  `{param}` placeholders are substituted from the tool call's params.
  */
  urlTemplate: string;
  /**
  JSON body template for POST actions; same `{param}` substitution.
  */
  bodyTemplate?: string;
  /**
  Dot-path to the result array in the JSON response, e.g. "data.items". Omit for a single-object result.
  */
  listPath?: string;
  /**
  Dot-path to the next-page cursor in the JSON response, if the API
  paginates. When set, `urlTemplate` (and `bodyTemplate`, for POST) should
  include a `{cursor}` placeholder — the fixed param name every paginated
  action uses — so the value this path extracts substitutes back in on the
  caller's next call via `params.cursor`.
  */
  nextCursorPath?: string;
  idField?: string;
  titleField?: string;
  urlField?: string;
  /**
  Marks this action as a mutation. The engine will not run it until the
  caller passes `confirm: true`, so an agent must surface the pending action
  to the user (e.g. via `ask-user`) before it can take effect — the
  lightweight, in-conversation confirmation gate ADR-0023 deferred, not a
  durable approval table (see AGENTS.md's write-connector-action rule).
  */
  isMutating?: boolean;
}

export const connectorDefinitions = pgTable(
  "connector_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    displayName: text("display_name").notNull(),
    /**
    A single emoji shown next to the connector in Settings and tool descriptions.
    */
    icon: text("icon"),
    description: text("description").notNull().default(""),
    authorizeUrl: text("authorize_url").notNull(),
    tokenUrl: text("token_url").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull().default([]),
    scopeDelimiter: text("scope_delimiter").notNull().default(" "),
    clientId: text("client_id").notNull(),
    encryptedClientSecret: text("encrypted_client_secret").notNull(),
    clientSecretIv: text("client_secret_iv").notNull(),
    clientSecretAuthTag: text("client_secret_auth_tag").notNull(),
    accountIdentifierUrl: text("account_identifier_url"),
    accountIdentifierField: text("account_identifier_field"),
    actions: jsonb("actions")
      .$type<ConnectorDefinitionAction[]>()
      .notNull()
      .default([]),
    definitionStatus: text("definition_status")
      .$type<"active" | "disabled">()
      .notNull()
      .default("active"),
    // When true, any member may connect their own personal account to this
    // connector (in addition to, or instead of, the org-wide connection an
    // admin can still set up) — see `connector_connections.scope`.
    allowPersonalConnections: boolean("allow_personal_connections")
      .notNull()
      .default(false),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("connector_definitions_org_slug_unique").on(
      table.organizationId,
      table.slug,
    ),
  ],
);

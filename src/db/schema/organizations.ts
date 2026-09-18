/**
 * Organizations, their members, and per-user preferences.
 */
import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  /**
   * "workos" mirrors a real WorkOS Organization (SDK Enterprises today).
   * "local" exists only in Pilot's own database — a self-serve workspace for
   * anyone without an SDK membership, never created in WorkOS.
   */
  source: text("source")
    .$type<"workos" | "local">()
    .notNull()
    .default("workos"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const members = pgTable(
  "members",
  {
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    workosUserId: text("workos_user_id").notNull(),
    workosMembershipId: text("workos_membership_id").notNull(),
    email: text("email").notNull(),
    roleSlug: text("role_slug").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.workosUserId] }),
    unique("members_workos_membership_id_unique").on(table.workosMembershipId),
  ],
);

export const organizationDomains = pgTable(
  "organization_domains",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    domain: text("domain").notNull(),
    status: text("status")
      .$type<"pending" | "verified">()
      .notNull()
      .default("pending"),
    verificationToken: text("verification_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (table) => [unique("organization_domains_domain_unique").on(table.domain)],
);

export const userPreferences = pgTable("user_preferences", {
  workosUserId: text("workos_user_id").primaryKey(),
  sendMessageShortcut: text("send_message_shortcut")
    .$type<"enter" | "mod_enter">()
    .notNull()
    .default("mod_enter"),
  conversationPanelLayout: jsonb("conversation_panel_layout").$type<{
    conversation: number;
    details: number;
  } | null>(),
  /**
   * Standing instructions the user writes once in Settings and that apply to
   * every Work conversation they start or continue, matching Cowork's
   * per-user "Settings > Cowork" template. Never used for Chat or Code.
   */
  workInstructions: text("work_instructions"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

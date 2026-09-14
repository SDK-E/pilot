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
} from "drizzle-orm/pg-core";

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
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

export const userPreferences = pgTable("user_preferences", {
  workosUserId: text("workos_user_id").primaryKey(),
  sendMessageShortcut: text("send_message_shortcut")
    .$type<"enter" | "mod_enter">()
    .notNull()
    .default("mod_enter"),
  uiLocale: text("ui_locale").$type<string | null>(),
  conversationPanelLayout: jsonb("conversation_panel_layout").$type<{
    conversation: number;
    details: number;
  } | null>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

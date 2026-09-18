/**
 * Organization-defined skills: a named bundle of extra instructions and
 * tool grants a user can enable on an agent, or select for one message.
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

import { organizations } from "./organizations";

export const skills = pgTable(
  "skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    toolIds: jsonb("tool_ids").$type<string[]>().notNull().default([]),
    // Set only for a skill installed from the marketplace (skills.sh) rather
    // than authored locally — `marketplaceId` is that skill's stable "{source}/
    // {slug}" id, used to detect a re-install instead of creating a duplicate.
    // Null for every locally authored skill, which is most of them.
    marketplaceId: text("marketplace_id"),
    marketplaceUrl: text("marketplace_url"),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    archived: boolean("archived").notNull().default(false),
  },
  (table) => [
    unique("skills_organization_name_unique").on(
      table.organizationId,
      table.name,
    ),
    index("skills_organization_created_at_index").on(
      table.organizationId,
      table.createdAt,
    ),
    // Postgres allows any number of rows with a NULL marketplaceId under a
    // unique constraint — this only ever rejects a genuine duplicate
    // install of the same marketplace skill into the same organization.
    unique("skills_organization_marketplace_id_unique").on(
      table.organizationId,
      table.marketplaceId,
    ),
  ],
);

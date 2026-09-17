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
  ],
);

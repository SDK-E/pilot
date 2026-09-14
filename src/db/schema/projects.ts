/**
 * Projects group conversations and files under shared instructions.
 */
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { conversations } from "./conversations";
import { organizations } from "./organizations";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    name: text("name").notNull(),
    instructions: text("instructions"),
    sharedMemoryEnabled: boolean("shared_memory_enabled")
      .default(false)
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    status: text("status")
      .$type<"active" | "deleting">()
      .notNull()
      .default("active"),
  },
  (table) => [
    unique("projects_organization_creator_name_unique").on(
      table.organizationId,
      table.createdByWorkosUserId,
      table.name,
    ),
    index("projects_organization_creator_updated_at_index").on(
      table.organizationId,
      table.createdByWorkosUserId,
      table.updatedAt,
    ),
  ],
);

export const projectConversations = pgTable(
  "project_conversations",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.conversationId] }),
    unique("project_conversations_conversation_id_unique").on(
      table.conversationId,
    ),
    index("project_conversations_conversation_id_index").on(
      table.conversationId,
    ),
  ],
);

export const projectFiles = pgTable(
  "project_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    pathname: text("pathname").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("project_files_pathname_unique").on(table.pathname),
    index("project_files_project_creator_created_at_index").on(
      table.projectId,
      table.createdByWorkosUserId,
      table.createdAt,
    ),
  ],
);

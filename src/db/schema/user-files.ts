/**
 * A member's personal knowledge base: files usable as context in every
 * conversation they have, regardless of project — the account-level
 * counterpart to `project_files` (project-scoped) and
 * `conversation_attachments` (conversation-scoped).
 */
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { organizations } from "./organizations";

export const userFiles = pgTable(
  "user_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
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
    unique("user_files_pathname_unique").on(table.pathname),
    index("user_files_creator_created_at_index").on(
      table.organizationId,
      table.createdByWorkosUserId,
      table.createdAt,
    ),
  ],
);

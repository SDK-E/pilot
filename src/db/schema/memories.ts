/**
 * User-authored memory notes — short, explicit facts a member records so
 * agents remember them across turns, distinct from pilot-ai's own semantic
 * conversation memory (embeddings/recall, gated by
 * `projects.sharedMemoryEnabled`). A note lives at exactly one scope, from
 * narrowest to broadest: one conversation, one project, one member (every
 * conversation they have), or the whole organization (every member's
 * conversations) — see `memory/memory-repository.ts`'s `resolveMemoryContext`
 * for how all four are gathered for one turn.
 */
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { conversations } from "./conversations";
import { organizations } from "./organizations";
import { projects } from "./projects";

export const memories = pgTable(
  "memories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    scope: text("scope")
      .$type<"conversation" | "project" | "user" | "organization">()
      .notNull(),
    // Set only for scope "conversation"; null otherwise.
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),
    // Set only for scope "project"; null otherwise.
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    createdByWorkosUserId: text("created_by_workos_user_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("memories_organization_scope_index").on(
      table.organizationId,
      table.scope,
    ),
    index("memories_conversation_index").on(table.conversationId),
    index("memories_project_index").on(table.projectId),
    index("memories_user_index").on(
      table.organizationId,
      table.createdByWorkosUserId,
      table.scope,
    ),
  ],
);

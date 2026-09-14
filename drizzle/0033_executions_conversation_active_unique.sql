-- migration 0033: one active execution per conversation
-- A retried or duplicated POST to the stream route persisted a new user
-- message on every attempt with nothing stopping two turns from running on
-- the same conversation at once. This constraint makes that impossible at
-- the database level; startExecution now treats the resulting unique
-- violation as "a turn is already running" instead of a raw insert failure.
--
-- Without the guard, production accumulated conversations with more than
-- one execution stuck in ('running', 'awaiting_approval') at once - exactly
-- the race this index prevents going forward. Before creating the index,
-- close every such row except the most recently started one per
-- conversation, so the CREATE UNIQUE INDEX below has no duplicates to
-- reject. No conversation message is touched or removed.
UPDATE "executions"
SET
  "status" = 'failed',
  "error_message" = 'Closed by migration 0033: superseded by a later execution on the same conversation.',
  "completed_at" = now()
WHERE "status" IN ('running', 'awaiting_approval')
  AND "id" NOT IN (
    SELECT DISTINCT ON ("conversation_id") "id"
    FROM "executions"
    WHERE "status" IN ('running', 'awaiting_approval')
    ORDER BY "conversation_id", "started_at" DESC
  );
--> statement-breakpoint
CREATE UNIQUE INDEX "executions_conversation_active_unique" ON "executions" USING btree ("conversation_id") WHERE "executions"."status" in ('running', 'awaiting_approval');

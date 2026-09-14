-- migration 0033: one active execution per conversation
-- A retried or duplicated POST to the stream route persisted a new user
-- message on every attempt with nothing stopping two turns from running on
-- the same conversation at once. This constraint makes that impossible at
-- the database level; startExecution now treats the resulting unique
-- violation as "a turn is already running" instead of a raw insert failure.
-- Additive: no data loss.

CREATE UNIQUE INDEX "executions_conversation_active_unique" ON "executions" USING btree ("conversation_id") WHERE "executions"."status" in ('running', 'awaiting_approval');

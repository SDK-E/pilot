-- migration 0034: mark failed-turn replies as errors
-- A failed turn used to leave the user's persisted message with no reply at
-- all, so a page reload showed it as silently unanswered. failTurn now
-- persists a worker-role reply describing the failure; this column lets the
-- client style that reply distinctly instead of rendering it like a normal
-- answer. Additive: no data loss.

ALTER TABLE "conversation_messages" ADD COLUMN "is_error" boolean DEFAULT false NOT NULL;

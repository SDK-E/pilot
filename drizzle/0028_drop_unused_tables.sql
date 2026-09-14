-- Removes tables that no Pilot code reads or writes. Goals, action proposals,
-- effect intents, lifecycle operations, and the durable-execution scaffolding
-- were planned features that never shipped.
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_goal_id_goals_id_fk";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "goal_id";--> statement-breakpoint
DROP TABLE IF EXISTS "effect_intents" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "action_proposals" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "lifecycle_operations" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "goals" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "execution_attempts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "budget_reservations" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "outbox_events" CASCADE;

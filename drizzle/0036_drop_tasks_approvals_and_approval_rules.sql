ALTER TABLE "approvals" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tasks" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "approvals" CASCADE;--> statement-breakpoint
DROP TABLE "tasks" CASCADE;--> statement-breakpoint
DROP INDEX "executions_conversation_active_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "executions_conversation_active_unique" ON "executions" USING btree ("conversation_id") WHERE "executions"."status" = 'running';--> statement-breakpoint
ALTER TABLE "workers" DROP COLUMN "approval_rules";
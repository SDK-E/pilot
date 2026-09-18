ALTER TABLE "work_runs" RENAME TO "agent_runs";--> statement-breakpoint
ALTER TABLE "agent_runs" DROP CONSTRAINT "work_runs_organization_id_organizations_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_runs" DROP CONSTRAINT "work_runs_worker_id_workers_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_runs" DROP CONSTRAINT "work_runs_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "agent_runs" DROP CONSTRAINT "work_runs_execution_id_executions_id_fk";
--> statement-breakpoint
DROP INDEX "work_runs_execution_id_unique";--> statement-breakpoint
DROP INDEX "work_runs_conversation_started_at_index";--> statement-breakpoint
DROP INDEX "work_runs_organization_status_index";--> statement-breakpoint
ALTER TABLE "agent_runs" ADD COLUMN "continuation_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_runs_execution_id_unique" ON "agent_runs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "agent_runs_conversation_started_at_index" ON "agent_runs" USING btree ("conversation_id","started_at");--> statement-breakpoint
CREATE INDEX "agent_runs_organization_status_index" ON "agent_runs" USING btree ("organization_id","status");
ALTER TABLE "approvals" ADD COLUMN "tool_call_id" text;
--> statement-breakpoint
ALTER TABLE "executions" DROP CONSTRAINT IF EXISTS "executions_status_check";
--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_execution_runtime_tool_call_unique" ON "approvals" USING btree ("execution_id","runtime_run_id","tool_call_id");

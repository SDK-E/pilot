CREATE TABLE "work_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"execution_id" uuid NOT NULL,
	"status" text NOT NULL,
	"max_steps" integer NOT NULL,
	"step_count" integer DEFAULT 0 NOT NULL,
	"cancel_requested_at" timestamp with time zone,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"error_message" text
);
--> statement-breakpoint
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_runs" ADD CONSTRAINT "work_runs_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "work_runs_execution_id_unique" ON "work_runs" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "work_runs_conversation_started_at_index" ON "work_runs" USING btree ("conversation_id","started_at");--> statement-breakpoint
CREATE INDEX "work_runs_organization_status_index" ON "work_runs" USING btree ("organization_id","status");
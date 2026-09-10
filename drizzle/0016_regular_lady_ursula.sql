CREATE TABLE "conversation_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_by_workos_user_id" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "conversation_attachments_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "tool_call_id" text;--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD CONSTRAINT "conversation_attachments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD CONSTRAINT "conversation_attachments_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD CONSTRAINT "conversation_attachments_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_attachments_conversation_creator_created_at_index" ON "conversation_attachments" USING btree ("conversation_id","created_by_workos_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "approvals_execution_runtime_tool_call_unique" ON "approvals" USING btree ("execution_id","runtime_run_id","tool_call_id");
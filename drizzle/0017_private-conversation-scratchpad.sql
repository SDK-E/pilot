CREATE TABLE "conversation_scratchpads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"worker_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_by_workos_user_id" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "approvals" ADD COLUMN "tool_id" text;--> statement-breakpoint
ALTER TABLE "conversation_scratchpads" ADD CONSTRAINT "conversation_scratchpads_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_scratchpads" ADD CONSTRAINT "conversation_scratchpads_worker_id_workers_id_fk" FOREIGN KEY ("worker_id") REFERENCES "public"."workers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_scratchpads" ADD CONSTRAINT "conversation_scratchpads_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_scratchpads_conversation_unique" ON "conversation_scratchpads" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "conversation_scratchpads_organization_updated_at_index" ON "conversation_scratchpads" USING btree ("organization_id","updated_at");
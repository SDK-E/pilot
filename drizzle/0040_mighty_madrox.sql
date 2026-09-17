CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"tool_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_workos_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "skills_organization_name_unique" UNIQUE("organization_id","name")
);
--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "enabled_skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD COLUMN "message_id" uuid;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "skill_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "connector_tool_ids" jsonb;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "skills_organization_created_at_index" ON "skills" USING btree ("organization_id","created_at");--> statement-breakpoint
ALTER TABLE "conversation_attachments" ADD CONSTRAINT "conversation_attachments_message_id_conversation_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversation_attachments_message_index" ON "conversation_attachments" USING btree ("message_id");
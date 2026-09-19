CREATE TABLE "memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"scope" text NOT NULL,
	"conversation_id" uuid,
	"project_id" uuid,
	"created_by_workos_user_id" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_workos_user_id" text NOT NULL,
	"pathname" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_files_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "general_instructions" text;--> statement-breakpoint
ALTER TABLE "organization_preferences" ADD COLUMN "standing_instructions" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "instructions" text;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memories" ADD CONSTRAINT "memories_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_files" ADD CONSTRAINT "user_files_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "memories_organization_scope_index" ON "memories" USING btree ("organization_id","scope");--> statement-breakpoint
CREATE INDEX "memories_conversation_index" ON "memories" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "memories_project_index" ON "memories" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "memories_user_index" ON "memories" USING btree ("organization_id","created_by_workos_user_id","scope");--> statement-breakpoint
CREATE INDEX "user_files_creator_created_at_index" ON "user_files" USING btree ("organization_id","created_by_workos_user_id","created_at");
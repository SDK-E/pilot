CREATE TABLE "project_conversations" (
	"project_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_conversations_project_id_conversation_id_pk" PRIMARY KEY("project_id","conversation_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_workos_user_id" text NOT NULL,
	"name" text NOT NULL,
	"instructions" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_organization_creator_name_unique" UNIQUE("organization_id","created_by_workos_user_id","name")
);
--> statement-breakpoint
ALTER TABLE "project_conversations" ADD CONSTRAINT "project_conversations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_conversations" ADD CONSTRAINT "project_conversations_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_conversations_conversation_id_index" ON "project_conversations" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "projects_organization_creator_updated_at_index" ON "projects" USING btree ("organization_id","created_by_workos_user_id","updated_at");
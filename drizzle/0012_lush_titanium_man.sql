CREATE TABLE "organization_preferences" (
	"organization_id" text PRIMARY KEY NOT NULL,
	"default_worker_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_preferences" ADD CONSTRAINT "organization_preferences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_preferences" ADD CONSTRAINT "organization_preferences_default_worker_id_workers_id_fk" FOREIGN KEY ("default_worker_id") REFERENCES "public"."workers"("id") ON DELETE set null ON UPDATE no action;
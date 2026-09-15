CREATE TABLE "connector_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"owner_scope" text NOT NULL,
	"owner_workos_user_id" text,
	"provider_id" text NOT NULL,
	"label" text NOT NULL,
	"account_identifier" text NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"access_token_iv" text NOT NULL,
	"access_token_auth_tag" text NOT NULL,
	"encrypted_refresh_token" text,
	"refresh_token_iv" text,
	"refresh_token_auth_tag" text,
	"token_expires_at" timestamp with time zone,
	"granted_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"last_error_message" text,
	"created_by_workos_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connector_connections" ADD CONSTRAINT "connector_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connector_connections_org_provider_idx" ON "connector_connections" USING btree ("organization_id","provider_id");--> statement-breakpoint
CREATE INDEX "connector_connections_org_user_provider_idx" ON "connector_connections" USING btree ("organization_id","owner_workos_user_id","provider_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connector_connections_org_default_unique" ON "connector_connections" USING btree ("organization_id","provider_id") WHERE "connector_connections"."status" = 'active' AND "connector_connections"."is_default" = true AND "connector_connections"."owner_scope" = 'organization';--> statement-breakpoint
CREATE UNIQUE INDEX "connector_connections_user_default_unique" ON "connector_connections" USING btree ("organization_id","owner_workos_user_id","provider_id") WHERE "connector_connections"."status" = 'active' AND "connector_connections"."is_default" = true AND "connector_connections"."owner_scope" = 'user';
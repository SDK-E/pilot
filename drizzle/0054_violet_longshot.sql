CREATE TABLE "connector_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_definition_id" uuid NOT NULL,
	"organization_id" text NOT NULL,
	"scope" text NOT NULL,
	"owner_workos_user_id" text,
	"account_identifier" text,
	"encrypted_access_token" text,
	"access_token_iv" text,
	"access_token_auth_tag" text,
	"encrypted_refresh_token" text,
	"refresh_token_iv" text,
	"refresh_token_auth_tag" text,
	"token_expires_at" timestamp with time zone,
	"granted_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"connection_status" text DEFAULT 'not_connected' NOT NULL,
	"last_error_message" text,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "requested_connector_slugs" jsonb;--> statement-breakpoint
ALTER TABLE "connector_definitions" ADD COLUMN "allow_personal_connections" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "connector_connections" ADD CONSTRAINT "connector_connections_connector_definition_id_connector_definitions_id_fk" FOREIGN KEY ("connector_definition_id") REFERENCES "public"."connector_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_connections" ADD CONSTRAINT "connector_connections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connector_connections_definition_index" ON "connector_connections" USING btree ("connector_definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connector_connections_org_scope_unique" ON "connector_connections" USING btree ("connector_definition_id") WHERE "connector_connections"."scope" = 'organization';--> statement-breakpoint
CREATE UNIQUE INDEX "connector_connections_personal_scope_unique" ON "connector_connections" USING btree ("connector_definition_id","owner_workos_user_id") WHERE "connector_connections"."scope" = 'personal';--> statement-breakpoint
-- Backfill: every existing connector_definitions row already held at most
-- one org-wide connection directly on itself. Move that connection state
-- into its own "organization"-scope connector_connections row before the
-- next migration drops the now-superseded columns from connector_definitions.
INSERT INTO "connector_connections" (
	"connector_definition_id", "organization_id", "scope",
	"account_identifier", "encrypted_access_token", "access_token_iv",
	"access_token_auth_tag", "encrypted_refresh_token", "refresh_token_iv",
	"refresh_token_auth_tag", "token_expires_at", "granted_scopes",
	"connection_status", "last_error_message", "last_used_at"
)
SELECT
	"id", "organization_id", 'organization',
	"account_identifier", "encrypted_access_token", "access_token_iv",
	"access_token_auth_tag", "encrypted_refresh_token", "refresh_token_iv",
	"refresh_token_auth_tag", "token_expires_at", "granted_scopes",
	"connection_status", "last_error_message", "last_used_at"
FROM "connector_definitions"
WHERE "connection_status" <> 'not_connected';
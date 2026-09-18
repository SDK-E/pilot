CREATE TABLE "connector_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"icon" text,
	"description" text DEFAULT '' NOT NULL,
	"authorize_url" text NOT NULL,
	"token_url" text NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scope_delimiter" text DEFAULT ' ' NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_ciphertext" text NOT NULL,
	"client_secret_iv" text NOT NULL,
	"client_secret_auth_tag" text NOT NULL,
	"account_identifier_url" text,
	"account_identifier_field" text,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_by_workos_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DROP TABLE "connector_provider_credentials" CASCADE;
CREATE TABLE "connector_provider_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"client_id" text NOT NULL,
	"client_secret_ciphertext" text NOT NULL,
	"client_secret_iv" text NOT NULL,
	"client_secret_auth_tag" text NOT NULL,
	"updated_by_workos_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connector_provider_credentials_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "platform_secrets" (
	"key" text PRIMARY KEY NOT NULL,
	"value_ciphertext" text NOT NULL,
	"value_iv" text NOT NULL,
	"value_auth_tag" text NOT NULL,
	"updated_by_workos_user_id" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

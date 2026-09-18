CREATE TABLE "byok_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"created_by_workos_user_id" text NOT NULL,
	"label" text NOT NULL,
	"provider_id" text NOT NULL,
	"base_url" text NOT NULL,
	"api_key_ciphertext" text NOT NULL,
	"api_key_iv" text NOT NULL,
	"api_key_auth_tag" text NOT NULL,
	"allowed_model_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "byok_credentials_user_label_unique" UNIQUE("created_by_workos_user_id","label")
);
--> statement-breakpoint
ALTER TABLE "byok_credentials" ADD CONSTRAINT "byok_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "byok_credentials" ADD CONSTRAINT "byok_credentials_provider_id_catalog_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."catalog_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "byok_credentials_user_index" ON "byok_credentials" USING btree ("organization_id","created_by_workos_user_id");
CREATE TABLE "catalog_models" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"display_name" text NOT NULL,
	"family" text,
	"attachment" boolean DEFAULT false NOT NULL,
	"reasoning" boolean DEFAULT false NOT NULL,
	"tool_call" boolean DEFAULT false NOT NULL,
	"context_limit" integer,
	"output_limit" integer,
	"input_cost_per_million" numeric,
	"output_cost_per_million" numeric,
	"modalities" jsonb,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"api_base_url" text,
	"npm_package" text,
	"docs_url" text,
	"env_var_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "catalog_models" ADD CONSTRAINT "catalog_models_provider_id_catalog_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."catalog_providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_models_provider_id_index" ON "catalog_models" USING btree ("provider_id");
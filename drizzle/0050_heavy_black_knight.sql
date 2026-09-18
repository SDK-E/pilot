ALTER TABLE "skills" ADD COLUMN "marketplace_id" text;--> statement-breakpoint
ALTER TABLE "skills" ADD COLUMN "marketplace_url" text;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_organization_marketplace_id_unique" UNIQUE("organization_id","marketplace_id");
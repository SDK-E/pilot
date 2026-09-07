ALTER TABLE "workers" ADD COLUMN "base_agent_id" text DEFAULT 'conversational' NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "goals" text;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "tone" text;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "output_format" text;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "enabled_tool_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "knowledge_source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "workers" ADD COLUMN "approval_rules" jsonb DEFAULT '{}'::jsonb NOT NULL;
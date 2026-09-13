ALTER TABLE "organization_preferences" ADD COLUMN "primary_model_id" text DEFAULT 'kilo/kilo-auto/free' NOT NULL;
ALTER TABLE "organization_preferences" ADD COLUMN "retry_enabled" boolean DEFAULT true NOT NULL;
CREATE TABLE "conversation_sources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "conversation_id" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE cascade,
  "message_id" uuid NOT NULL REFERENCES "conversation_messages"("id") ON DELETE cascade,
  "created_by_workos_user_id" text NOT NULL,
  "title" text NOT NULL,
  "domain" text NOT NULL,
  "url" text NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX "conversation_sources_message_index" ON "conversation_sources" ("message_id");
CREATE INDEX "conversation_sources_conversation_creator_index" ON "conversation_sources" ("conversation_id", "created_by_workos_user_id");

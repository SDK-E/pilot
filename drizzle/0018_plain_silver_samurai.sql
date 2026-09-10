ALTER TABLE "conversation_messages" ADD COLUMN "user_question_options" jsonb;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD COLUMN "user_question_selection_mode" text;
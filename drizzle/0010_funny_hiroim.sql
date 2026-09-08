CREATE TABLE "user_preferences" (
	"workos_user_id" text PRIMARY KEY NOT NULL,
	"send_message_shortcut" text DEFAULT 'mod_enter' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

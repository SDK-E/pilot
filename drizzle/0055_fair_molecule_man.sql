ALTER TABLE "connector_definitions" DROP COLUMN "account_identifier";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "encrypted_access_token";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "access_token_iv";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "access_token_auth_tag";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "encrypted_refresh_token";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "refresh_token_iv";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "refresh_token_auth_tag";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "token_expires_at";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "granted_scopes";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "connection_status";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "last_error_message";--> statement-breakpoint
ALTER TABLE "connector_definitions" DROP COLUMN "last_used_at";
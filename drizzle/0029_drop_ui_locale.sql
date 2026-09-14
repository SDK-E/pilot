-- The interface language preference was stored but never applied.
ALTER TABLE "user_preferences" DROP COLUMN IF EXISTS "ui_locale";

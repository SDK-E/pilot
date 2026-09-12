-- migration 0022: user interface locale preference
-- additive: no data loss, uiLocale nullable, no backfill needed

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS ui_locale TEXT;

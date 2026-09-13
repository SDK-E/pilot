-- migration 0026: per-user conversation panel layout preference
-- additive: no data loss, conversation_panel_layout nullable, no backfill needed

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS conversation_panel_layout JSONB;

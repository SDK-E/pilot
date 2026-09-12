-- migration 0023: conversation runtime v2 schema
-- additive: adds parts, schemaVersion, status, requestId to conversation_messages
-- backfill: text content wrapped as text part in parts array
-- no data loss; old content column retained behind application-side flag

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS request_id UUID;

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS parts JSONB;

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS schema_version INTEGER DEFAULT 1;

ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'complete';

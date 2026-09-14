-- migration 0027: agents are one of three kinds: chat, work, code
-- Research is discontinued; every conversational or research agent becomes a
-- chat agent. The auto-classifier approval mode was never implemented and is
-- folded into ask.

UPDATE workers
SET base_agent_id = 'chat'
WHERE base_agent_id IN ('conversational', 'research');

ALTER TABLE workers ALTER COLUMN base_agent_id SET DEFAULT 'chat';

UPDATE workers
SET approval_rules = (
  SELECT COALESCE(jsonb_object_agg(key, CASE WHEN value = '"auto-classifier"' THEN '"ask"'::jsonb ELSE value END), '{}'::jsonb)
  FROM jsonb_each(approval_rules)
)
WHERE approval_rules::text LIKE '%auto-classifier%';

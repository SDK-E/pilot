-- migration 0024: durable execution, attempts, outbox, budget
-- extend executions with V2 status (completed -> succeeded mapping at read)
-- new tables: execution_attempts, budget_reservations, outbox_events
-- handles are NOT rewritten; active runs keep their current handles

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS request_id UUID;

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS budget_id UUID;

ALTER TABLE executions
  ADD COLUMN IF NOT EXISTS parent_execution_id UUID;

ALTER TABLE executions
  ALTER COLUMN status TYPE TEXT;

CREATE TABLE IF NOT EXISTS execution_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions (id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (execution_id, attempt_number)
);

CREATE TABLE IF NOT EXISTS budget_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions (id) ON DELETE CASCADE,
  parent_budget_id UUID REFERENCES budget_reservations (id),
  token_limit BIGINT NOT NULL DEFAULT 0,
  cost_limit BIGINT NOT NULL DEFAULT 0,
  step_limit INTEGER NOT NULL DEFAULT 0,
  tool_call_limit INTEGER NOT NULL DEFAULT 0,
  sandbox_seconds_limit INTEGER NOT NULL DEFAULT 0,
  delegation_depth_limit INTEGER NOT NULL DEFAULT 0,
  spent_tokens BIGINT NOT NULL DEFAULT 0,
  spent_cost BIGINT NOT NULL DEFAULT 0,
  spent_steps INTEGER NOT NULL DEFAULT 0,
  spent_tool_calls INTEGER NOT NULL DEFAULT 0,
  spent_sandbox_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS budget_reservations_execution_id_idx
  ON budget_reservations (execution_id);

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions (id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  dispatched_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_dispatched_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS outbox_events_status_idx
  ON outbox_events (status);

CREATE INDEX IF NOT EXISTS outbox_events_execution_id_idx
  ON outbox_events (execution_id);

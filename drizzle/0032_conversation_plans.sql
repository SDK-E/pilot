-- migration 0032: visible per-conversation plan (Todo list) for Work/Code agents
-- additive: no data loss. Idempotent guards match the established pattern for
-- migrations bridging the missing 0021-0031 snapshot gap (see docs/progress.md,
-- "Migration journal reconciliation").

CREATE TABLE IF NOT EXISTS conversation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  created_by_workos_user_id TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversation_plans_conversation_unique UNIQUE (conversation_id)
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS conversation_plans_organization_updated_at_index
  ON conversation_plans (organization_id, updated_at);

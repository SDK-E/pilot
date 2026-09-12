-- migration 0025: action proposals and effect intents
-- new tables: action_proposals, effect_intents
-- proposals are private handles; approvals retain only proposalId/hash
-- existing approvals remain active with their V1 handler

CREATE TABLE IF NOT EXISTS action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  proposal_id TEXT NOT NULL,
  proposal_hash TEXT NOT NULL,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  target_ref TEXT NOT NULL,
  artifact_revision TEXT,
  canonical_args_hash TEXT NOT NULL,
  permission_snapshot JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  risk_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (proposal_id),
  UNIQUE (proposal_hash)
);

CREATE INDEX IF NOT EXISTS action_proposals_organization_status_index
  ON action_proposals (organization_id, status, created_at);

CREATE INDEX IF NOT EXISTS action_proposals_target_index
  ON action_proposals (organization_id, target_ref);

CREATE TABLE IF NOT EXISTS effect_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations (id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES action_proposals (id) ON DELETE SET NULL,
  approval_id UUID,
  effect_key TEXT NOT NULL,
  external_ref TEXT,
  status TEXT NOT NULL DEFAULT 'prepared',
  result JSONB,
  dispatched_at TIMESTAMP WITH TIME ZONE,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (effect_key)
);

CREATE INDEX IF NOT EXISTS effect_intents_organization_proposal_index
  ON effect_intents (organization_id, proposal_id);

CREATE INDEX IF NOT EXISTS effect_intents_status_index
  ON effect_intents (status);

-- trigger for updated_at
CREATE OR REPLACE FUNCTION update_action_proposals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER action_proposals_updated_at
  BEFORE UPDATE ON action_proposals
  FOR EACH ROW EXECUTE FUNCTION update_action_proposals_updated_at();

CREATE OR REPLACE FUNCTION update_effect_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER effect_intents_updated_at
  BEFORE UPDATE ON effect_intents
  FOR EACH ROW EXECUTE FUNCTION update_effect_intents_updated_at();

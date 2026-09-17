-- migration 0030: local (non-WorkOS) organizations and domain verification
-- additive: no data loss. Existing rows default to source='workos' since
-- every organization synced today mirrors a real WorkOS Organization.

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'workos';
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS organization_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  CONSTRAINT organization_domains_domain_unique UNIQUE (domain)
);

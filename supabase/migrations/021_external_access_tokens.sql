-- Migration: External access tokens for client portal (no-login)
-- Date: 2026-05-04
-- Purpose: Signed links for client content approvals and chat interactions

CREATE TABLE IF NOT EXISTS external_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES content_threads(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{"can_comment": true, "can_update_status": true}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_external_access_tokens_tenant_client
  ON external_access_tokens(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_external_access_tokens_post_id
  ON external_access_tokens(post_id);
CREATE INDEX IF NOT EXISTS idx_external_access_tokens_thread_id
  ON external_access_tokens(thread_id);
CREATE INDEX IF NOT EXISTS idx_external_access_tokens_expires_at
  ON external_access_tokens(expires_at);

ALTER TABLE external_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own external tokens" ON external_access_tokens
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own external tokens" ON external_access_tokens
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own external tokens" ON external_access_tokens
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own external tokens" ON external_access_tokens
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE external_access_tokens IS 'Signed public links for client portal interactions without login';

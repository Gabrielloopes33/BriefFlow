-- Migration: Create app_sessions + fix FK references to use app_users
-- Date: 2026-05-04
-- Purpose: Decouple from Supabase auth.users, use app_users directly

-- 1. Create app_sessions referencing app_users
CREATE TABLE IF NOT EXISTS app_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_tenant_id ON app_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_sessions_token_hash ON app_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON app_sessions(expires_at);

-- 2. Add app_user_id column to tenant_members (parallel to user_id)
ALTER TABLE tenant_members ADD COLUMN IF NOT EXISTS app_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tenant_members_app_user_id ON tenant_members(app_user_id);

-- 3. Add app_owner_id to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS app_owner_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

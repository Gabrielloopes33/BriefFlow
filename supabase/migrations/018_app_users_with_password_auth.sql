-- Migration: app_users with password auth (dev fallback)
-- Date: 2026-05-04
-- Purpose: Support authentication directly via PostgreSQL when Supabase Auth is unavailable

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Simple password-based app users table (development/fallback)
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_is_active ON app_users(is_active);

-- Create a function to verify password (bcrypt-like comparison)
-- Note: This uses crypt() which requires pgcrypto
CREATE OR REPLACE FUNCTION verify_password(provided_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(provided_password, stored_hash) = stored_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create RLS policies for app_users table
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON app_users
  FOR SELECT
  USING (auth.uid()::text = id::text);

CREATE POLICY "Users cannot update other users"
  ON app_users
  FOR UPDATE
  USING (auth.uid()::text = id::text);

-- Update tenants to optionally reference app_users instead of auth.users
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_app_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

-- Insert default admin user (for development)
-- Email: admin@example.com
-- Password: Admin123! (hashed with md5 for development)
INSERT INTO app_users (id, email, password_hash, full_name, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin@example.com',
  crypt('Admin123!', gen_salt('bf')),
  'Admin User',
  true
)
ON CONFLICT (email) DO NOTHING;

-- Create a default tenant for the admin user
INSERT INTO tenants (id, owner_user_id, name, slug, isolation_mode)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM app_users WHERE email = 'admin@example.com'),
  'Admin Workspace',
  'admin-workspace',
  'shared'
)
ON CONFLICT (id) DO NOTHING;

-- Add admin user to tenant
INSERT INTO tenant_members (tenant_id, user_id, role, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM app_users WHERE email = 'admin@example.com'),
  'owner',
  true
)
ON CONFLICT (tenant_id, user_id) DO NOTHING;

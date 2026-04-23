-- Postgres Compatibility Layer (no Supabase)
-- Run FIRST before all migrations.
-- Emulates auth.users FK target and auth.uid() used in migrations/policies.

-- 1) auth schema
CREATE SCHEMA IF NOT EXISTS auth;

-- 2) auth.users stub — stores just the UUID, no password/email here.
--    Real auth is handled by the external Supabase instance.
CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 3) auth.uid() — returns current user UUID set per-request by the backend.
--    Backend must call: SET LOCAL app.current_user_id = '<uuid>';
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$;

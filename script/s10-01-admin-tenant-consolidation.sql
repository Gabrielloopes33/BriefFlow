-- S10-01: Consolidate all legacy data under one admin tenant
-- Usage:
--   psql "$DATABASE_URL" -v ADMIN_USER_ID="<uuid>" -f script/s10-01-admin-tenant-consolidation.sql
--
-- IMPORTANT:
-- 1) Run on staging first.
-- 2) Keep a pg_dump backup before production execution.

\if :{?ADMIN_USER_ID}
\else
\echo 'ERROR: ADMIN_USER_ID is required. Example: -v ADMIN_USER_ID="11111111-0000-0000-0000-000000000111"'
\quit 1
\endif

BEGIN;

INSERT INTO tenants (owner_user_id, name, slug, isolation_mode)
VALUES (:'ADMIN_USER_ID', 'BriefFlow Admin', 'admin-main-tenant', 'shared')
ON CONFLICT (slug) DO NOTHING;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
INSERT INTO tenant_members (tenant_id, user_id, role, is_active)
SELECT id, :'ADMIN_USER_ID', 'owner', true FROM admin_tenant
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET role = 'owner',
    is_active = true;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE clients
SET tenant_id = (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE sources s
SET tenant_id = c.tenant_id
FROM clients c
WHERE s.client_id = c.id;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE contents ct
SET tenant_id = c.tenant_id
FROM clients c
WHERE ct.client_id = c.id;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE briefs b
SET tenant_id = c.tenant_id
FROM clients c
WHERE b.client_id = c.id;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE analysis_configs ac
SET tenant_id = c.tenant_id
FROM clients c
WHERE ac.client_id = c.id;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE knowledge_items ki
SET tenant_id = c.tenant_id
FROM clients c
WHERE ki.client_id = c.id;

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE analytics_tokens
SET tenant_id = (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE posts
SET tenant_id = (SELECT id FROM admin_tenant)
WHERE tenant_id IS DISTINCT FROM (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE jobs
SET tenant_id = (SELECT id FROM admin_tenant)
WHERE tenant_id IS DISTINCT FROM (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE agents
SET tenant_id = (SELECT id FROM admin_tenant)
WHERE tenant_id IS DISTINCT FROM (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE agent_graphs
SET tenant_id = (SELECT id FROM admin_tenant)
WHERE tenant_id IS DISTINCT FROM (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE agent_executions
SET tenant_id = (SELECT id FROM admin_tenant)
WHERE tenant_id IS DISTINCT FROM (SELECT id FROM admin_tenant);

WITH admin_tenant AS (
  SELECT id FROM tenants WHERE owner_user_id = :'ADMIN_USER_ID' ORDER BY created_at ASC LIMIT 1
)
UPDATE creatives
SET tenant_id = (SELECT id FROM admin_tenant)
WHERE tenant_id IS DISTINCT FROM (SELECT id FROM admin_tenant);

COMMIT;

-- Sprint 2 / S2-04 validation checklist
-- Execute after migration 005 on staging.

\echo '=== 1) tenant_id NOT NULL checks ==='
SELECT 'clients' AS table_name, COUNT(*) AS null_tenant_rows FROM clients WHERE tenant_id IS NULL
UNION ALL
SELECT 'sources', COUNT(*) FROM sources WHERE tenant_id IS NULL
UNION ALL
SELECT 'contents', COUNT(*) FROM contents WHERE tenant_id IS NULL
UNION ALL
SELECT 'briefs', COUNT(*) FROM briefs WHERE tenant_id IS NULL
UNION ALL
SELECT 'analysis_configs', COUNT(*) FROM analysis_configs WHERE tenant_id IS NULL
UNION ALL
SELECT 'knowledge_items', COUNT(*) FROM knowledge_items WHERE tenant_id IS NULL
UNION ALL
SELECT 'analytics_tokens', COUNT(*) FROM analytics_tokens WHERE tenant_id IS NULL;

\echo '=== 2) FK consistency by client lineage ==='
SELECT 'sources_mismatch' AS check_name, COUNT(*) AS mismatch_count
FROM sources s
JOIN clients c ON c.id = s.client_id
WHERE s.tenant_id <> c.tenant_id
UNION ALL
SELECT 'contents_mismatch', COUNT(*)
FROM contents ct
JOIN clients c ON c.id = ct.client_id
WHERE ct.tenant_id <> c.tenant_id
UNION ALL
SELECT 'briefs_mismatch', COUNT(*)
FROM briefs b
JOIN clients c ON c.id = b.client_id
WHERE b.tenant_id <> c.tenant_id
UNION ALL
SELECT 'analysis_configs_mismatch', COUNT(*)
FROM analysis_configs ac
JOIN clients c ON c.id = ac.client_id
WHERE ac.tenant_id <> c.tenant_id
UNION ALL
SELECT 'knowledge_items_mismatch', COUNT(*)
FROM knowledge_items ki
JOIN clients c ON c.id = ki.client_id
WHERE ki.tenant_id <> c.tenant_id;

\echo '=== 3) tenant control-plane sanity ==='
SELECT COUNT(*) AS tenants_total FROM tenants;
SELECT COUNT(*) AS tenant_members_total FROM tenant_members;

\echo '=== 4) duplicate memberships ==='
SELECT tenant_id, user_id, COUNT(*) AS duplicates
FROM tenant_members
GROUP BY tenant_id, user_id
HAVING COUNT(*) > 1;

\echo '=== 5) RLS enabled checks ==='
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
  'tenants',
  'tenant_members',
  'clients',
  'sources',
  'contents',
  'briefs',
  'analysis_configs',
  'knowledge_items',
  'analytics_tokens'
)
ORDER BY relname;
-- Sprint 2 / S2-04 validation checklist
-- Execute after migration 005 on staging.

\echo '=== 1) tenant_id NOT NULL checks ==='
SELECT 'clients' AS table_name, COUNT(*) AS null_tenant_rows FROM clients WHERE tenant_id IS NULL
UNION ALL
SELECT 'sources', COUNT(*) FROM sources WHERE tenant_id IS NULL
UNION ALL
SELECT 'contents', COUNT(*) FROM contents WHERE tenant_id IS NULL
UNION ALL
SELECT 'briefs', COUNT(*) FROM briefs WHERE tenant_id IS NULL
UNION ALL
SELECT 'analysis_configs', COUNT(*) FROM analysis_configs WHERE tenant_id IS NULL
UNION ALL
SELECT 'knowledge_items', COUNT(*) FROM knowledge_items WHERE tenant_id IS NULL
UNION ALL
SELECT 'analytics_tokens', COUNT(*) FROM analytics_tokens WHERE tenant_id IS NULL;

\echo '=== 2) FK consistency by client lineage ==='
SELECT 'sources_mismatch' AS check_name, COUNT(*) AS mismatch_count
FROM sources s
JOIN clients c ON c.id = s.client_id
WHERE s.tenant_id <> c.tenant_id
UNION ALL
SELECT 'contents_mismatch', COUNT(*)
FROM contents ct
JOIN clients c ON c.id = ct.client_id
WHERE ct.tenant_id <> c.tenant_id
UNION ALL
SELECT 'briefs_mismatch', COUNT(*)
FROM briefs b
JOIN clients c ON c.id = b.client_id
WHERE b.tenant_id <> c.tenant_id
UNION ALL
SELECT 'analysis_configs_mismatch', COUNT(*)
FROM analysis_configs ac
JOIN clients c ON c.id = ac.client_id
WHERE ac.tenant_id <> c.tenant_id
UNION ALL
SELECT 'knowledge_items_mismatch', COUNT(*)
FROM knowledge_items ki
JOIN clients c ON c.id = ki.client_id
WHERE ki.tenant_id <> c.tenant_id;

\echo '=== 3) tenant control-plane sanity ==='
SELECT COUNT(*) AS tenants_total FROM tenants;
SELECT COUNT(*) AS tenant_members_total FROM tenant_members;

\echo '=== 4) duplicate memberships ==='
SELECT tenant_id, user_id, COUNT(*) AS duplicates
FROM tenant_members
GROUP BY tenant_id, user_id
HAVING COUNT(*) > 1;

\echo '=== 5) RLS enabled checks ==='
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN (
  'tenants',
  'tenant_members',
  'clients',
  'sources',
  'contents',
  'briefs',
  'analysis_configs',
  'knowledge_items',
  'analytics_tokens'
)
ORDER BY relname;

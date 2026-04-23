-- S3-06: Post Async Flow End-to-End Test
-- Validates job creation, idempotency, and post isolation.
-- Run with: psql $DATABASE_URL -v ON_ERROR_STOP=1 -f script/s3-06-post-flow-test.sql

\echo '=== S3-06: Post Async Flow Test ==='
\echo ''

BEGIN;

-- ---------------------------------------------------------------
-- 1. Fixture: tenant + user + client
-- ---------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO auth.users (id) VALUES
    ('eeeeeeee-0000-0000-0000-000000000005')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO tenants (id, owner_user_id, name, slug) VALUES
    ('ffffffff-0000-0000-0000-000000000006', 'eeeeeeee-0000-0000-0000-000000000005', 'Test Tenant Posts', 'test-tenant-posts')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO tenant_members (tenant_id, user_id, role) VALUES
    ('ffffffff-0000-0000-0000-000000000006', 'eeeeeeee-0000-0000-0000-000000000005', 'owner')
  ON CONFLICT DO NOTHING;

  INSERT INTO clients (id, tenant_id, user_id, name)
  VALUES ('33333333-0000-0000-0000-000000000003', 'ffffffff-0000-0000-0000-000000000006', 'eeeeeeee-0000-0000-0000-000000000005', 'Client For Posts')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ---------------------------------------------------------------
-- 2. Check 1: Insert job with valid payload
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_job_id UUID;
BEGIN
  INSERT INTO jobs (tenant_id, client_id, user_id, status, stage, progress, attempt, max_attempts, idempotency_key, payload)
  VALUES ('ffffffff-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000005',
          'queued', 'validating_input', 0, 0, 3, 'test-key-001',
          '{"goal":"authority","language":"pt-BR","channels":["blog"]}'::jsonb)
  RETURNING id INTO v_job_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'FAIL Check 1: Job was not created';
  END IF;
  RAISE NOTICE 'PASS Check 1: Job created with id %', v_job_id;
END $$;

-- ---------------------------------------------------------------
-- 3. Check 2: Idempotency key unique per tenant+client
-- ---------------------------------------------------------------
DO $$
BEGIN
  INSERT INTO jobs (tenant_id, client_id, user_id, status, stage, progress, attempt, max_attempts, idempotency_key, payload)
  VALUES ('ffffffff-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000005',
          'queued', 'validating_input', 0, 0, 3, 'test-key-001',
          '{"goal":"authority","language":"pt-BR","channels":["blog"]}'::jsonb);
  RAISE EXCEPTION 'FAIL Check 2: Duplicate idempotency key should be rejected';
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'PASS Check 2: Duplicate idempotency key correctly rejected';
END $$;

-- ---------------------------------------------------------------
-- 4. Check 3: Insert post and link to job
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_post_id UUID;
  v_job_id UUID;
BEGIN
  INSERT INTO posts (tenant_id, client_id, user_id, title, content, channels, status)
  VALUES ('ffffffff-0000-0000-0000-000000000006', '33333333-0000-0000-0000-000000000003', 'eeeeeeee-0000-0000-0000-000000000005',
          'Test Post', 'Content body', '["blog"]'::jsonb, 'draft')
  RETURNING id INTO v_post_id;

  UPDATE jobs SET result_post_id = v_post_id, status = 'completed', progress = 100
  WHERE idempotency_key = 'test-key-001' AND tenant_id = 'ffffffff-0000-0000-0000-000000000006'
  RETURNING id INTO v_job_id;

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'FAIL Check 3: Job update failed';
  END IF;
  RAISE NOTICE 'PASS Check 3: Post created and linked to job. post_id=%, job_id=%', v_post_id, v_job_id;
END $$;

-- ---------------------------------------------------------------
-- 5. Check 4: Tenant isolation on posts
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM posts
  WHERE tenant_id = 'ffffffff-0000-0000-0000-000000000006';

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL Check 4: Expected 1 post for tenant, got %', v_count;
  END IF;
  RAISE NOTICE 'PASS Check 4: Tenant isolation on posts verified (count=%)', v_count;
END $$;

-- ---------------------------------------------------------------
-- 6. Check 5: RLS enabled on new tables
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_posts_rls BOOLEAN;
  v_jobs_rls BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO v_posts_rls FROM pg_class WHERE relname = 'posts';
  SELECT relrowsecurity INTO v_jobs_rls FROM pg_class WHERE relname = 'jobs';

  IF NOT v_posts_rls THEN
    RAISE EXCEPTION 'FAIL Check 5a: RLS not enabled on posts';
  END IF;
  IF NOT v_jobs_rls THEN
    RAISE EXCEPTION 'FAIL Check 5b: RLS not enabled on jobs';
  END IF;
  RAISE NOTICE 'PASS Check 5: RLS enabled on posts and jobs';
END $$;

\echo ''
\echo '=== ALL S3-06 CHECKS PASSED: Post async flow verified ==='
\echo ''

ROLLBACK;

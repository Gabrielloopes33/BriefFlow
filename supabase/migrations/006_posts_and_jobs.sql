-- Migration: Posts and Async Jobs (Sprint 3)
-- Contrato: docs/api/posts-async-openapi-v1.yaml

-- ============================================================
-- posts
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  channels JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready_review', 'approved', 'rejected', 'published')),
  generated_by TEXT DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_posts_tenant_id ON posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_posts_client_id ON posts(client_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

-- ============================================================
-- jobs (async post generation)
-- ============================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'retrying', 'completed', 'failed', 'canceled')),
  stage TEXT DEFAULT 'validating_input' CHECK (stage IN ('validating_input', 'fetching_sources', 'crawling_content', 'extracting_insights', 'drafting_post', 'finalizing')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  attempt INTEGER NOT NULL DEFAULT 1 CHECK (attempt >= 1),
  max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),
  error JSONB,
  result_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_tenant_id ON jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_jobs_client_id ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency_key ON jobs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_idempotency_unique ON jobs(tenant_id, client_id, idempotency_key);

-- ============================================================
-- RLS policies for posts
-- ============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own posts" ON posts
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

-- ============================================================
-- RLS policies for jobs
-- ============================================================
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own jobs" ON jobs
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own jobs" ON jobs
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own jobs" ON jobs
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own jobs" ON jobs
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

-- ============================================================
-- Comments
-- ============================================================
COMMENT ON TABLE posts IS 'Posts gerados manualmente ou via pipeline assincrono de IA';
COMMENT ON TABLE jobs IS 'Jobs de geracao assincrona de posts com rastreabilidade e retry';

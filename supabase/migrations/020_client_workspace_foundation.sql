-- Migration: Client workspace foundation (calendar, kanban, collaboration)
-- Date: 2026-05-04
-- Purpose: Add per-client scheduling fields and collaboration threads/messages

-- ============================================================
-- posts: scheduling + production metadata
-- ============================================================
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stage_tag TEXT,
  ADD COLUMN IF NOT EXISTS kanban_order INTEGER NOT NULL DEFAULT 0;

UPDATE posts
SET stage_tag = COALESCE(stage_tag, 'draft')
WHERE stage_tag IS NULL;

ALTER TABLE posts
  ALTER COLUMN stage_tag SET DEFAULT 'draft';

-- Expand status set while keeping backward compatibility with legacy states.
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts
  ADD CONSTRAINT posts_status_check
  CHECK (
    status IN (
      'draft',
      'in_production',
      'needs_adjustment',
      'ready_review',
      'in_approval',
      'approved',
      'scheduled',
      'published',
      'rejected'
    )
  );

CREATE INDEX IF NOT EXISTS idx_posts_scheduled_for ON posts(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_posts_stage_tag ON posts(stage_tag);
CREATE INDEX IF NOT EXISTS idx_posts_kanban_order ON posts(tenant_id, client_id, kanban_order);

-- ============================================================
-- content_threads: collaboration channels per content/task
-- ============================================================
CREATE TABLE IF NOT EXISTS content_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  context_type TEXT NOT NULL DEFAULT 'content' CHECK (context_type IN ('content', 'task')),
  task_title TEXT,
  stage_tag TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_threads_tenant_client ON content_threads(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_content_threads_post_id ON content_threads(post_id);
CREATE INDEX IF NOT EXISTS idx_content_threads_updated_at ON content_threads(updated_at DESC);

-- ============================================================
-- content_messages: messages inside each thread
-- ============================================================
CREATE TABLE IF NOT EXISTS content_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES content_threads(id) ON DELETE CASCADE,
  author_id UUID,
  author_role TEXT NOT NULL DEFAULT 'team' CHECK (author_role IN ('team', 'client')),
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_messages_thread_id ON content_messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_content_messages_tenant_id ON content_messages(tenant_id);

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE content_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own content threads" ON content_threads
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own content threads" ON content_threads
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own content threads" ON content_threads
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own content threads" ON content_threads
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can insert own content messages" ON content_messages
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own content messages" ON content_messages
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own content messages" ON content_messages
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own content messages" ON content_messages
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

COMMENT ON TABLE content_threads IS 'Client workspace collaboration threads per content/task';
COMMENT ON TABLE content_messages IS 'Messages exchanged inside content/task collaboration threads';

-- Migration 012: Post status audit trail
-- Sprint 8 S8-04: approval workflow with transition history

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS status_updated_by UUID REFERENCES auth.users(id);

CREATE TABLE IF NOT EXISTS post_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_status_history_tenant_id ON post_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_post_status_history_post_id ON post_status_history(post_id);
CREATE INDEX IF NOT EXISTS idx_post_status_history_changed_at ON post_status_history(changed_at DESC);

ALTER TABLE post_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own post status history" ON post_status_history;
DROP POLICY IF EXISTS "Users can select own post status history" ON post_status_history;
DROP POLICY IF EXISTS "Users can update own post status history" ON post_status_history;
DROP POLICY IF EXISTS "Users can delete own post status history" ON post_status_history;

CREATE POLICY "Users can insert own post status history" ON post_status_history
  FOR INSERT WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can select own post status history" ON post_status_history
  FOR SELECT USING (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can update own post status history" ON post_status_history
  FOR UPDATE USING (current_user_is_tenant_member(tenant_id))
  WITH CHECK (current_user_is_tenant_member(tenant_id));

CREATE POLICY "Users can delete own post status history" ON post_status_history
  FOR DELETE USING (current_user_is_tenant_member(tenant_id));

UPDATE posts
SET status_updated_at = COALESCE(status_updated_at, updated_at, created_at, NOW())
WHERE status_updated_at IS NULL;

INSERT INTO post_status_history (tenant_id, post_id, from_status, to_status, changed_by, changed_at)
SELECT p.tenant_id, p.id, NULL, p.status, p.user_id, COALESCE(p.status_updated_at, p.updated_at, p.created_at, NOW())
FROM posts p
WHERE NOT EXISTS (
  SELECT 1
  FROM post_status_history h
  WHERE h.post_id = p.id
);

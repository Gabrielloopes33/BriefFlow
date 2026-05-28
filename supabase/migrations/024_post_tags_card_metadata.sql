-- Migration: Post tags + card metadata
-- Epic 11 S11-01

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS format_type TEXT DEFAULT 'carousel'
    CHECK (format_type IN ('carousel', 'reels', 'static', 'story', 'text')),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS color_label TEXT;

-- Atualizar posts existentes para ter valor padrão em format_type
UPDATE posts
SET format_type = 'carousel'
WHERE format_type IS NULL;

-- Índice GIN para busca eficiente por tags
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_posts_format_type ON posts(format_type);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'posts'
      AND column_name = 'scheduled_for'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_posts_tenant_client_scheduled
             ON posts(tenant_id, client_id, scheduled_for)
             WHERE scheduled_for IS NOT NULL';
  END IF;
END $$;

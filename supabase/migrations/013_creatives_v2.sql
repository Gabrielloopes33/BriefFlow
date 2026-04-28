-- Migration: Creatives V2 fields for SDD creatives editor
-- Adds layout, typography and profile metadata fields

ALTER TABLE creatives
  ADD COLUMN IF NOT EXISTS layout_mode TEXT NOT NULL DEFAULT 'minimalist'
    CHECK (layout_mode IN ('minimalist', 'profile')),
  ADD COLUMN IF NOT EXISTS font_combination JSONB DEFAULT '{"title":"Space","body":"Inter"}'::jsonb,
  ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#3B82F6',
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS profile_config JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_creatives_layout_mode ON creatives(layout_mode);

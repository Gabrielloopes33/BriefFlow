-- Migration 010: Add wizard fields to clients table
-- Sprint 8 S8-02: ClientWizard onboarding

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS tone_of_voice TEXT,
  ADD COLUMN IF NOT EXISTS content_pillars TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS forbidden_words TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS preferred_format TEXT;

-- Example posts stored as JSON array in clients for simplicity
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS example_posts JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN clients.tone_of_voice IS 'Brand tone: formal, casual, inspirador, educativo, bem-humorado';
COMMENT ON COLUMN clients.content_pillars IS 'Up to 5 content topic pillars';
COMMENT ON COLUMN clients.forbidden_words IS 'Words the brand should never use';
COMMENT ON COLUMN clients.website IS 'Main website or social profile URL';
COMMENT ON COLUMN clients.preferred_format IS 'Preferred content format: carousel, reels, single, text';
COMMENT ON COLUMN clients.example_posts IS 'Array of {url, engagement} example posts';

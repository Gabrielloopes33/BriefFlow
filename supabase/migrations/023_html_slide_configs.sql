-- Migration: editable HTML slide configs as source of truth
-- Date: 2026-05-27
-- Story: S10-02

ALTER TABLE creatives
  ADD COLUMN IF NOT EXISTS html_slide_configs JSONB DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_creatives_html_slide_configs
  ON creatives USING gin (html_slide_configs)
  WHERE html_slide_configs IS NOT NULL;

COMMENT ON COLUMN creatives.html_slide_configs IS
  'Array of HtmlSlideConfig objects. Source of truth for HTML slide editor; html_slides is derived from configToHtml().';

-- Migration: HTML slides for Satori-based carousel rendering
-- Date: 2026-05-27
-- Story: S10-01 — Migração Konva → HTML/CSS + Satori
-- Purpose: Store generated HTML/CSS per slide

ALTER TABLE creatives
  ADD COLUMN IF NOT EXISTS html_slides JSONB DEFAULT NULL;

COMMENT ON COLUMN creatives.html_slides IS 'Array of HTML/CSS strings per slide, derived from HtmlSlideConfig via configToHtml';

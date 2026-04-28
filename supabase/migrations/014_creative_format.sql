-- Migration: Creative Editor Redesign — Formatos e Coordenadas Relativas
-- Adiciona suporte a múltiplos aspect ratios (square, portrait, story)
-- e campos de dimensão do canvas

-- ============================================================
-- TABELA: creative_templates
-- ============================================================
ALTER TABLE creative_templates
  ADD COLUMN IF NOT EXISTS format VARCHAR(20) NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS canvas_width INTEGER NOT NULL DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER NOT NULL DEFAULT 1080;

-- Atualizar templates existentes: inferir formato da altura no structure
UPDATE creative_templates
SET format = 'portrait',
    canvas_height = 1350
WHERE structure->>'height' = '1350';

UPDATE creative_templates
SET format = 'story',
    canvas_height = 1920
WHERE structure->>'height' = '1920';

-- Atualizar structure dos templates existentes para incluir format
UPDATE creative_templates
SET structure = jsonb_set(
  structure,
  '{format}',
  to_jsonb(format)
)
WHERE structure->>'format' IS NULL;

-- ============================================================
-- TABELA: creatives
-- ============================================================
ALTER TABLE creatives
  ADD COLUMN IF NOT EXISTS format VARCHAR(20) NOT NULL DEFAULT 'square',
  ADD COLUMN IF NOT EXISTS canvas_width INTEGER NOT NULL DEFAULT 1080,
  ADD COLUMN IF NOT EXISTS canvas_height INTEGER NOT NULL DEFAULT 1080;

-- Atualizar creatives existentes baseado no primeiro slide
UPDATE creatives
SET format = 'portrait',
    canvas_height = 1350
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(slides) AS slide
  WHERE (slide->>'index')::int = 0
    AND (
      (slide->'layers'->0->>'y')::float > 600
      OR (slide->'layers'->1->>'y')::float > 600
    )
);

-- Índice para filtragem por formato
CREATE INDEX IF NOT EXISTS idx_templates_format ON creative_templates(format);
CREATE INDEX IF NOT EXISTS idx_creatives_format ON creatives(format);

COMMENT ON COLUMN creative_templates.format IS 'Aspect ratio do template: square (1:1), portrait (4:5), story (9:16)';
COMMENT ON COLUMN creatives.format IS 'Aspect ratio do creative: square (1:1), portrait (4:5), story (9:16)';

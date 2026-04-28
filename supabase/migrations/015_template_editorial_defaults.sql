-- Migration: Template Editorial Defaults (E7)
-- Atualiza templates existentes com defaults de estilo editorial dark
-- e cria novos templates portrait de alta qualidade

-- ============================================================
-- ATUALIZAR TEMPLATES EXISTENTES
-- ============================================================

-- Atualizar templates existentes para usar formato portrait e defaults editoriais
UPDATE creative_templates
SET
  format = 'portrait',
  canvas_height = 1350,
  structure = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          structure,
          '{format}',
          '"portrait"'
        ),
        '{height}',
        '1350'
      ),
      '{slides,0,theme}',
      '"dark"'
    ),
    '{slides,0,typography}',
    '{
      "globalScale": 100,
      "titleFontSize": 80,
      "titleFontFamily": "Syne",
      "subtitleFontSize": 24,
      "accentColor": "#FF4C1F",
      "accentWords": []
    }'::jsonb
  )
WHERE is_global = true
  AND (structure->>'height' IS NULL OR structure->>'height' = '1080');

-- Atualizar overlay para diag-inf-dir com opacidade 65
UPDATE creative_templates
SET structure = jsonb_set(
  structure,
  '{slides,0,overlay}',
  '{
    "style": "diag-inf-dir",
    "color": "#000000",
    "opacity": 65
  }'::jsonb
)
WHERE is_global = true;

-- Atualizar CTA para visível apenas no último slide (default: false nos templates)
UPDATE creative_templates
SET structure = jsonb_set(
  structure,
  '{slides,0,ctaButton}',
  '{
    "visible": false,
    "text": "Salve este post",
    "style": "filled",
    "size": 16,
    "borderRadius": 4,
    "backgroundColor": "#ffffff",
    "textColor": "#000000"
  }'::jsonb
)
WHERE is_global = true;

-- Atualizar textLayout para bot-left com alinhamento left
UPDATE creative_templates
SET structure = jsonb_set(
  structure,
  '{slides,0,textLayout}',
  '{
    "position": "bot-left",
    "alignment": "left",
    "title": "{{headline}}",
    "subtitle": "{{body}}"
  }'::jsonb
)
WHERE is_global = true;

-- ============================================================
-- CRIAR NOVOS TEMPLATES EDITORIAIS PORTRAIT
-- ============================================================

-- Template 1: Editorial Dark Cinematic
INSERT INTO creative_templates (
  tenant_id, name, type, platform, slides_count, format, canvas_width, canvas_height,
  structure, thumbnail_url, is_global, is_active
)
SELECT
  NULL,
  'Editorial Dark Cinematic',
  'carousel',
  'instagram',
  6,
  'portrait',
  1080,
  1350,
  '{
    "width": 1080,
    "height": 1350,
    "format": "portrait",
    "slides": [
      {
        "id": "slide-1",
        "index": 0,
        "theme": "dark",
        "background": {
          "type": "gradient",
          "value": "linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)"
        },
        "overlay": {
          "style": "diag-inf-dir",
          "color": "#000000",
          "opacity": 65
        },
        "textLayout": {
          "position": "bot-left",
          "alignment": "left",
          "title": "{{headline}}",
          "subtitle": "{{body}}"
        },
        "typography": {
          "globalScale": 100,
          "titleFontSize": 84,
          "titleFontFamily": "Syne",
          "subtitleFontSize": 24,
          "accentColor": "#FF4C1F",
          "accentWords": []
        },
        "ctaButton": {
          "visible": false,
          "text": "Salve este post",
          "style": "filled",
          "size": 16,
          "borderRadius": 4,
          "backgroundColor": "#ffffff",
          "textColor": "#000000"
        },
        "layers": [
          {
            "id": "layer-title",
            "type": "text",
            "x": 80,
            "y": 650,
            "width": 920,
            "height": 280,
            "text": "{{headline}}",
            "fontSize": 84,
            "fontWeight": "bold",
            "fontFamily": "Syne",
            "color": "#ffffff",
            "align": "left",
            "editable": true
          },
          {
            "id": "layer-subtitle",
            "type": "text",
            "x": 80,
            "y": 830,
            "width": 920,
            "height": 200,
            "text": "{{body}}",
            "fontSize": 24,
            "fontWeight": "normal",
            "fontFamily": "Inter",
            "color": "#d1d5db",
            "align": "left",
            "editable": true
          }
        ]
      }
    ]
  }'::jsonb,
  NULL,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM creative_templates WHERE name = 'Editorial Dark Cinematic' AND is_global = true
);

-- Template 2: Editorial Minimalista
INSERT INTO creative_templates (
  tenant_id, name, type, platform, slides_count, format, canvas_width, canvas_height,
  structure, thumbnail_url, is_global, is_active
)
SELECT
  NULL,
  'Editorial Minimalista',
  'carousel',
  'instagram',
  5,
  'portrait',
  1080,
  1350,
  '{
    "width": 1080,
    "height": 1350,
    "format": "portrait",
    "slides": [
      {
        "id": "slide-1",
        "index": 0,
        "theme": "dark",
        "background": {
          "type": "gradient",
          "value": "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
        },
        "overlay": {
          "style": "base-forte",
          "color": "#000000",
          "opacity": 55
        },
        "textLayout": {
          "position": "mid-left",
          "alignment": "left",
          "title": "{{headline}}",
          "subtitle": "{{body}}"
        },
        "typography": {
          "globalScale": 100,
          "titleFontSize": 72,
          "titleFontFamily": "Space",
          "subtitleFontSize": 28,
          "accentColor": "#3B82F6",
          "accentWords": []
        },
        "ctaButton": {
          "visible": false,
          "text": "Saiba mais",
          "style": "outline",
          "size": 16,
          "borderRadius": 8,
          "backgroundColor": "#ffffff",
          "textColor": "#ffffff"
        },
        "layers": [
          {
            "id": "layer-title",
            "type": "text",
            "x": 80,
            "y": 375,
            "width": 920,
            "height": 260,
            "text": "{{headline}}",
            "fontSize": 72,
            "fontWeight": "bold",
            "fontFamily": "Space",
            "color": "#ffffff",
            "align": "left",
            "editable": true
          },
          {
            "id": "layer-subtitle",
            "type": "text",
            "x": 80,
            "y": 555,
            "width": 920,
            "height": 200,
            "text": "{{body}}",
            "fontSize": 28,
            "fontWeight": "normal",
            "fontFamily": "Inter",
            "color": "#e5e7eb",
            "align": "left",
            "editable": true
          }
        ]
      }
    ]
  }'::jsonb,
  NULL,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM creative_templates WHERE name = 'Editorial Minimalista' AND is_global = true
);

-- Template 3: Editorial Bold Impact
INSERT INTO creative_templates (
  tenant_id, name, type, platform, slides_count, format, canvas_width, canvas_height,
  structure, thumbnail_url, is_global, is_active
)
SELECT
  NULL,
  'Editorial Bold Impact',
  'carousel',
  'instagram',
  7,
  'portrait',
  1080,
  1350,
  '{
    "width": 1080,
    "height": 1350,
    "format": "portrait",
    "slides": [
      {
        "id": "slide-1",
        "index": 0,
        "theme": "dark",
        "background": {
          "type": "gradient",
          "value": "linear-gradient(180deg, #000000 0%, #1a1a2e 60%, #0f172a 100%)"
        },
        "overlay": {
          "style": "diag-inf-dir",
          "color": "#000000",
          "opacity": 70
        },
        "textLayout": {
          "position": "bot-left",
          "alignment": "left",
          "title": "{{headline}}",
          "subtitle": "{{body}}"
        },
        "typography": {
          "globalScale": 100,
          "titleFontSize": 96,
          "titleFontFamily": "Oswald",
          "subtitleFontSize": 22,
          "accentColor": "#f59e0b",
          "accentWords": []
        },
        "ctaButton": {
          "visible": false,
          "text": "Salve este post",
          "style": "filled",
          "size": 16,
          "borderRadius": 4,
          "backgroundColor": "#f59e0b",
          "textColor": "#000000"
        },
        "layers": [
          {
            "id": "layer-title",
            "type": "text",
            "x": 80,
            "y": 650,
            "width": 920,
            "height": 320,
            "text": "{{headline}}",
            "fontSize": 96,
            "fontWeight": "bold",
            "fontFamily": "Oswald",
            "color": "#ffffff",
            "align": "left",
            "editable": true
          },
          {
            "id": "layer-subtitle",
            "type": "text",
            "x": 80,
            "y": 830,
            "width": 920,
            "height": 180,
            "text": "{{body}}",
            "fontSize": 22,
            "fontWeight": "normal",
            "fontFamily": "Inter",
            "color": "#d1d5db",
            "align": "left",
            "editable": true
          }
        ]
      }
    ]
  }'::jsonb,
  NULL,
  true,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM creative_templates WHERE name = 'Editorial Bold Impact' AND is_global = true
);

-- Atualizar slides_count dos novos templates
UPDATE creative_templates
SET slides_count = (structure->'slides'->0->>'index')::int + 1
WHERE name IN ('Editorial Dark Cinematic', 'Editorial Minimalista', 'Editorial Bold Impact')
  AND is_global = true;

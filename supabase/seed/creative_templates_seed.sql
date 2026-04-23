-- Seed: Template global de exemplo para validação do schema (S7-01)
-- Este template é um Post Único de Impacto (1 slide) — o mais simples para validação

INSERT INTO creative_templates (
  tenant_id,
  name,
  type,
  platform,
  slides_count,
  structure,
  thumbnail_url,
  is_global,
  is_active
) VALUES (
  NULL,  -- NULL = template global visível para todos os tenants
  'Post Único de Impacto',
  'single',
  'universal',
  1,
  '{
    "width": 1080,
    "height": 1080,
    "slides": [
      {
        "id": "slide-1",
        "index": 0,
        "background": {
          "type": "gradient",
          "value": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        },
        "layers": [
          {
            "id": "layer-headline",
            "type": "text",
            "x": 80,
            "y": 300,
            "width": 920,
            "height": 200,
            "text": "{{headline}}",
            "fontSize": 64,
            "fontWeight": "bold",
            "color": "#ffffff",
            "align": "center",
            "editable": true
          },
          {
            "id": "layer-subtitle",
            "type": "text",
            "x": 120,
            "y": 520,
            "width": 840,
            "height": 120,
            "text": "{{body}}",
            "fontSize": 28,
            "fontWeight": "normal",
            "color": "#e0e0e0",
            "align": "center",
            "editable": true
          },
          {
            "id": "layer-handle",
            "type": "text",
            "x": 80,
            "y": 900,
            "width": 920,
            "height": 60,
            "text": "{{client_handle}}",
            "fontSize": 20,
            "fontWeight": "normal",
            "color": "#cccccc",
            "align": "center",
            "editable": false
          }
        ]
      }
    ]
  }'::jsonb,
  NULL,  -- thumbnail_url será gerado após primeiro uso
  true,  -- is_global
  true   -- is_active
);

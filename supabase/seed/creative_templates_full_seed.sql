-- Seed: Pack de 6 Templates Globais (S7-03)
-- Templates de carrossel e posts para Instagram/LinkedIn

-- ============================================================
-- 1. Carrossel Educativo (5 slides)
-- ============================================================
INSERT INTO creative_templates (tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active) VALUES
(NULL, 'Carrossel Educativo', 'carousel', 'instagram', 5, '{
  "width": 1080, "height": 1080,
  "slides": [
    {
      "id": "slide-1", "index": 0,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" },
      "layers": [
        { "id": "layer-headline", "type": "text", "x": 80, "y": 280, "width": 920, "height": 200, "text": "{{headline}}", "fontSize": 64, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{headline}}" },
        { "id": "layer-subtitle", "type": "text", "x": 120, "y": 520, "width": 840, "height": 100, "text": "{{body}}", "fontSize": 28, "fontWeight": "normal", "color": "#e0e0e0", "align": "center", "editable": true, "placeholder": "{{body}}" },
        { "id": "layer-handle", "type": "text", "x": 80, "y": 920, "width": 920, "height": 50, "text": "{{client_handle}}", "fontSize": 20, "fontWeight": "normal", "color": "#cccccc", "align": "center", "editable": false, "placeholder": "{{client_handle}}" }
      ]
    },
    {
      "id": "slide-2", "index": 1,
      "background": { "type": "color", "value": "#1a1a2e" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 80, "width": 200, "height": 120, "text": "01", "fontSize": 96, "fontWeight": "bold", "color": "#667eea", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 80, "text": "{{slide_title_1}}", "fontSize": 40, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_1}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 320, "width": 920, "height": 300, "text": "{{slide_body_1}}", "fontSize": 26, "fontWeight": "normal", "color": "#d0d0d0", "align": "left", "editable": true, "placeholder": "{{slide_body_1}}" }
      ]
    },
    {
      "id": "slide-3", "index": 2,
      "background": { "type": "color", "value": "#1a1a2e" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 80, "width": 200, "height": 120, "text": "02", "fontSize": 96, "fontWeight": "bold", "color": "#667eea", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 80, "text": "{{slide_title_2}}", "fontSize": 40, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_2}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 320, "width": 920, "height": 300, "text": "{{slide_body_2}}", "fontSize": 26, "fontWeight": "normal", "color": "#d0d0d0", "align": "left", "editable": true, "placeholder": "{{slide_body_2}}" }
      ]
    },
    {
      "id": "slide-4", "index": 3,
      "background": { "type": "color", "value": "#1a1a2e" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 80, "width": 200, "height": 120, "text": "03", "fontSize": 96, "fontWeight": "bold", "color": "#667eea", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 80, "text": "{{slide_title_3}}", "fontSize": 40, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_3}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 320, "width": 920, "height": 300, "text": "{{slide_body_3}}", "fontSize": 26, "fontWeight": "normal", "color": "#d0d0d0", "align": "left", "editable": true, "placeholder": "{{slide_body_3}}" }
      ]
    },
    {
      "id": "slide-5", "index": 4,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #764ba2 0%, #667eea 100%)" },
      "layers": [
        { "id": "layer-cta", "type": "text", "x": 80, "y": 300, "width": 920, "height": 150, "text": "{{cta}}", "fontSize": 52, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{cta}}" },
        { "id": "layer-handle", "type": "text", "x": 80, "y": 500, "width": 920, "height": 50, "text": "{{client_handle}}", "fontSize": 24, "fontWeight": "normal", "color": "#e0e0e0", "align": "center", "editable": false, "placeholder": "{{client_handle}}" }
      ]
    }
  ]
}'::jsonb, NULL, true, true);

-- ============================================================
-- 2. Carrossel de Case (4 slides)
-- ============================================================
INSERT INTO creative_templates (tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active) VALUES
(NULL, 'Carrossel de Case', 'carousel', 'instagram', 4, '{
  "width": 1080, "height": 1080,
  "slides": [
    {
      "id": "slide-1", "index": 0,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
      "layers": [
        { "id": "layer-tag", "type": "text", "x": 80, "y": 120, "width": 300, "height": 50, "text": "CASE", "fontSize": 24, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": false },
        { "id": "layer-headline", "type": "text", "x": 80, "y": 280, "width": 920, "height": 200, "text": "{{headline}}", "fontSize": 60, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{headline}}" }
      ]
    },
    {
      "id": "slide-2", "index": 1,
      "background": { "type": "color", "value": "#0f2027" },
      "layers": [
        { "id": "layer-title", "type": "text", "x": 80, "y": 120, "width": 920, "height": 80, "text": "O Desafio", "fontSize": 40, "fontWeight": "bold", "color": "#38ef7d", "align": "left", "editable": false },
        { "id": "layer-body", "type": "text", "x": 80, "y": 240, "width": 920, "height": 400, "text": "{{slide_body_1}}", "fontSize": 28, "fontWeight": "normal", "color": "#d0d0d0", "align": "left", "editable": true, "placeholder": "{{slide_body_1}}" }
      ]
    },
    {
      "id": "slide-3", "index": 2,
      "background": { "type": "color", "value": "#0f2027" },
      "layers": [
        { "id": "layer-title", "type": "text", "x": 80, "y": 120, "width": 920, "height": 80, "text": "A Solução", "fontSize": 40, "fontWeight": "bold", "color": "#38ef7d", "align": "left", "editable": false },
        { "id": "layer-body", "type": "text", "x": 80, "y": 240, "width": 920, "height": 400, "text": "{{slide_body_2}}", "fontSize": 28, "fontWeight": "normal", "color": "#d0d0d0", "align": "left", "editable": true, "placeholder": "{{slide_body_2}}" }
      ]
    },
    {
      "id": "slide-4", "index": 3,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
      "layers": [
        { "id": "layer-result", "type": "text", "x": 80, "y": 200, "width": 920, "height": 120, "text": "{{slide_title_3}}", "fontSize": 56, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{slide_title_3}}" },
        { "id": "layer-cta", "type": "text", "x": 80, "y": 400, "width": 920, "height": 100, "text": "{{cta}}", "fontSize": 32, "fontWeight": "normal", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{cta}}" }
      ]
    }
  ]
}'::jsonb, NULL, true, true);

-- ============================================================
-- 3. Post Único de Impacto (1 slide)
-- ============================================================
INSERT INTO creative_templates (tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active) VALUES
(NULL, 'Post Único de Impacto', 'single', 'universal', 1, '{
  "width": 1080, "height": 1080,
  "slides": [
    {
      "id": "slide-1", "index": 0,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)" },
      "layers": [
        { "id": "layer-headline", "type": "text", "x": 80, "y": 250, "width": 920, "height": 250, "text": "{{headline}}", "fontSize": 72, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{headline}}" },
        { "id": "layer-subtitle", "type": "text", "x": 120, "y": 540, "width": 840, "height": 120, "text": "{{body}}", "fontSize": 28, "fontWeight": "normal", "color": "#ffe0e0", "align": "center", "editable": true, "placeholder": "{{body}}" },
        { "id": "layer-handle", "type": "text", "x": 80, "y": 900, "width": 920, "height": 50, "text": "{{client_handle}}", "fontSize": 20, "fontWeight": "normal", "color": "#ffcccc", "align": "center", "editable": false, "placeholder": "{{client_handle}}" }
      ]
    }
  ]
}'::jsonb, NULL, true, true);

-- ============================================================
-- 4. Carrossel Lista (6 slides)
-- ============================================================
INSERT INTO creative_templates (tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active) VALUES
(NULL, 'Carrossel Lista', 'carousel', 'instagram', 6, '{
  "width": 1080, "height": 1080,
  "slides": [
    {
      "id": "slide-1", "index": 0,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
      "layers": [
        { "id": "layer-headline", "type": "text", "x": 80, "y": 300, "width": 920, "height": 200, "text": "{{headline}}", "fontSize": 64, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{headline}}" },
        { "id": "layer-sub", "type": "text", "x": 120, "y": 520, "width": 840, "height": 80, "text": "Deslize para ver todas →", "fontSize": 24, "fontWeight": "normal", "color": "#ffffff", "align": "center", "editable": false }
      ]
    },
    {
      "id": "slide-2", "index": 1,
      "background": { "type": "color", "value": "#2d132c" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 100, "width": 150, "height": 100, "text": "1", "fontSize": 80, "fontWeight": "bold", "color": "#fa709a", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 70, "text": "{{slide_title_1}}", "fontSize": 36, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_1}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 310, "width": 920, "height": 300, "text": "{{slide_body_1}}", "fontSize": 26, "fontWeight": "normal", "color": "#e0c0c0", "align": "left", "editable": true, "placeholder": "{{slide_body_1}}" }
      ]
    },
    {
      "id": "slide-3", "index": 2,
      "background": { "type": "color", "value": "#2d132c" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 100, "width": 150, "height": 100, "text": "2", "fontSize": 80, "fontWeight": "bold", "color": "#fa709a", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 70, "text": "{{slide_title_2}}", "fontSize": 36, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_2}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 310, "width": 920, "height": 300, "text": "{{slide_body_2}}", "fontSize": 26, "fontWeight": "normal", "color": "#e0c0c0", "align": "left", "editable": true, "placeholder": "{{slide_body_2}}" }
      ]
    },
    {
      "id": "slide-4", "index": 3,
      "background": { "type": "color", "value": "#2d132c" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 100, "width": 150, "height": 100, "text": "3", "fontSize": 80, "fontWeight": "bold", "color": "#fa709a", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 70, "text": "{{slide_title_3}}", "fontSize": 36, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_3}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 310, "width": 920, "height": 300, "text": "{{slide_body_3}}", "fontSize": 26, "fontWeight": "normal", "color": "#e0c0c0", "align": "left", "editable": true, "placeholder": "{{slide_body_3}}" }
      ]
    },
    {
      "id": "slide-5", "index": 4,
      "background": { "type": "color", "value": "#2d132c" },
      "layers": [
        { "id": "layer-num", "type": "text", "x": 80, "y": 100, "width": 150, "height": 100, "text": "4", "fontSize": 80, "fontWeight": "bold", "color": "#fa709a", "align": "left", "editable": false },
        { "id": "layer-title", "type": "text", "x": 80, "y": 220, "width": 920, "height": 70, "text": "{{slide_title_4}}", "fontSize": 36, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{slide_title_4}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 310, "width": 920, "height": 300, "text": "{{slide_body_4}}", "fontSize": 26, "fontWeight": "normal", "color": "#e0c0c0", "align": "left", "editable": true, "placeholder": "{{slide_body_4}}" }
      ]
    },
    {
      "id": "slide-6", "index": 5,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)" },
      "layers": [
        { "id": "layer-cta", "type": "text", "x": 80, "y": 300, "width": 920, "height": 150, "text": "{{cta}}", "fontSize": 52, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{cta}}" },
        { "id": "layer-handle", "type": "text", "x": 80, "y": 500, "width": 920, "height": 50, "text": "{{client_handle}}", "fontSize": 24, "fontWeight": "normal", "color": "#ffffff", "align": "center", "editable": false, "placeholder": "{{client_handle}}" }
      ]
    }
  ]
}'::jsonb, NULL, true, true);

-- ============================================================
-- 5. Antes e Depois (3 slides)
-- ============================================================
INSERT INTO creative_templates (tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active) VALUES
(NULL, 'Antes e Depois', 'carousel', 'instagram', 3, '{
  "width": 1080, "height": 1080,
  "slides": [
    {
      "id": "slide-1", "index": 0,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #434343 0%, #000000 100%)" },
      "layers": [
        { "id": "layer-tag", "type": "text", "x": 80, "y": 120, "width": 300, "height": 50, "text": "ANTES", "fontSize": 28, "fontWeight": "bold", "color": "#ff6b6b", "align": "left", "editable": false },
        { "id": "layer-headline", "type": "text", "x": 80, "y": 300, "width": 920, "height": 200, "text": "{{headline}}", "fontSize": 56, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": true, "placeholder": "{{headline}}" },
        { "id": "layer-body", "type": "text", "x": 80, "y": 540, "width": 920, "height": 200, "text": "{{body}}", "fontSize": 26, "fontWeight": "normal", "color": "#c0c0c0", "align": "left", "editable": true, "placeholder": "{{body}}" }
      ]
    },
    {
      "id": "slide-2", "index": 1,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #000000 0%, #434343 100%)" },
      "layers": [
        { "id": "layer-tag", "type": "text", "x": 80, "y": 120, "width": 400, "height": 50, "text": "A TRANSFORMAÇÃO", "fontSize": 28, "fontWeight": "bold", "color": "#ffd93d", "align": "left", "editable": false },
        { "id": "layer-body", "type": "text", "x": 80, "y": 280, "width": 920, "height": 400, "text": "{{slide_body_1}}", "fontSize": 28, "fontWeight": "normal", "color": "#e0e0e0", "align": "left", "editable": true, "placeholder": "{{slide_body_1}}" }
      ]
    },
    {
      "id": "slide-3", "index": 2,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
      "layers": [
        { "id": "layer-tag", "type": "text", "x": 80, "y": 120, "width": 300, "height": 50, "text": "DEPOIS", "fontSize": 28, "fontWeight": "bold", "color": "#ffffff", "align": "left", "editable": false },
        { "id": "layer-result", "type": "text", "x": 80, "y": 300, "width": 920, "height": 150, "text": "{{slide_title_2}}", "fontSize": 52, "fontWeight": "bold", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{slide_title_2}}" },
        { "id": "layer-cta", "type": "text", "x": 80, "y": 500, "width": 920, "height": 100, "text": "{{cta}}", "fontSize": 32, "fontWeight": "normal", "color": "#ffffff", "align": "center", "editable": true, "placeholder": "{{cta}}" }
      ]
    }
  ]
}'::jsonb, NULL, true, true);

-- ============================================================
-- 6. Quote / Citação (1 slide)
-- ============================================================
INSERT INTO creative_templates (tenant_id, name, type, platform, slides_count, structure, thumbnail_url, is_global, is_active) VALUES
(NULL, 'Quote / Citação', 'single', 'universal', 1, '{
  "width": 1080, "height": 1080,
  "slides": [
    {
      "id": "slide-1", "index": 0,
      "background": { "type": "gradient", "value": "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)" },
      "layers": [
        { "id": "layer-quote", "type": "text", "x": 100, "y": 200, "width": 880, "height": 400, "text": "{{headline}}", "fontSize": 48, "fontWeight": "normal", "color": "#5a3d2b", "align": "center", "editable": true, "placeholder": "{{headline}}", "fontFamily": "Georgia, serif" },
        { "id": "layer-attribution", "type": "text", "x": 100, "y": 650, "width": 880, "height": 60, "text": "{{client_handle}}", "fontSize": 24, "fontWeight": "normal", "color": "#8b6f5c", "align": "center", "editable": false, "placeholder": "{{client_handle}}" },
        { "id": "layer-deco", "type": "text", "x": 100, "y": 140, "width": 880, "height": 80, "text": """", "fontSize": 120, "fontWeight": "bold", "color": "#fcb69f", "align": "center", "editable": false }
      ]
    }
  ]
}'::jsonb, NULL, true, true);

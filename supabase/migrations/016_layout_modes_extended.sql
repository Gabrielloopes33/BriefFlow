-- Adiciona novos modos de layout ao CHECK constraint
ALTER TABLE creatives DROP CONSTRAINT IF EXISTS creatives_layout_mode_check;

ALTER TABLE creatives
  ADD CONSTRAINT creatives_layout_mode_check
  CHECK (layout_mode IN ('minimalist', 'profile', 'editorial', 'bold', 'split', 'cinematic', 'twitter'));

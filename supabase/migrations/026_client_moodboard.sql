-- Migration 026: Tabela de imagens do moodboard do cliente

CREATE TABLE IF NOT EXISTS client_moodboard_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  label TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_moodboard_tenant_client
  ON client_moodboard_images(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_moodboard_display_order
  ON client_moodboard_images(client_id, display_order);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_moodboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_moodboard_updated_at ON client_moodboard_images;
CREATE TRIGGER trg_moodboard_updated_at
  BEFORE UPDATE ON client_moodboard_images
  FOR EACH ROW
  EXECUTE FUNCTION update_moodboard_updated_at();

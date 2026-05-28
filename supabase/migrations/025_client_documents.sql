-- Migration 025: Tabela de documentos da base de conhecimento do cliente
-- Suporta upload, extração de texto e busca full-text

CREATE TABLE IF NOT EXISTS client_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'md', 'txt', 'docx', 'csv', 'json')),
  file_size INTEGER NOT NULL, -- em bytes
  storage_path TEXT NOT NULL, -- path no Supabase Storage
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'indexed', 'failed')),
  extraction_error TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_client_documents_tenant_client
  ON client_documents(tenant_id, client_id);

CREATE INDEX IF NOT EXISTS idx_client_documents_status
  ON client_documents(extraction_status);

-- Full-text search (português)
ALTER TABLE client_documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('portuguese', COALESCE(extracted_text, '') || ' ' || COALESCE(file_name, '') || ' ' || COALESCE(label, ''))
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_client_documents_search
  ON client_documents USING GIN(search_vector);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_client_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_documents_updated_at ON client_documents;
CREATE TRIGGER trg_client_documents_updated_at
  BEFORE UPDATE ON client_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_client_documents_updated_at();

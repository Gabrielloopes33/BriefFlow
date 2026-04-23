-- Migration 011: Improve text search performance for posts library (S8-03)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_posts_title_trgm
  ON posts USING GIN (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_posts_content_trgm
  ON posts USING GIN (content gin_trgm_ops);

ALTER TABLE articles
ADD COLUMN IF NOT EXISTS taxonomy_tags text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_articles_taxonomy_tags
ON articles USING GIN (taxonomy_tags);

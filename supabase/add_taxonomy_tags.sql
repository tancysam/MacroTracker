-- Add taxonomy_tags column to articles table
ALTER TABLE articles
ADD COLUMN IF NOT EXISTS taxonomy_tags text[] DEFAULT '{}';

-- Create a GIN index for efficient array containment queries (cs operator)
CREATE INDEX IF NOT EXISTS idx_articles_taxonomy_tags
ON articles USING GIN (taxonomy_tags);

-- MacroTracker Database Schema
-- Run this in Supabase SQL Editor

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  url_hash TEXT UNIQUE NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  source TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- AI-extracted metadata
  sentiment TEXT CHECK (sentiment IN ('Bullish', 'Bearish', 'Neutral')),
  magnitude NUMERIC(3,1) CHECK (magnitude >= 0 AND magnitude <= 10),
  primary_topic_key TEXT,
  primary_topic_display TEXT,

  -- Entity tags as text arrays
  entities_topics TEXT[] DEFAULT '{}',
  entities_markets TEXT[] DEFAULT '{}',
  entities_people TEXT[] DEFAULT '{}',
  entities_companies TEXT[] DEFAULT '{}',
  entities_policies TEXT[] DEFAULT '{}',

  -- Embedding vector (OpenAI text-embedding-3-small = 1536 dimensions)
  embedding vector(1536)
);

-- Entity mentions for HeatScore tracking
CREATE TABLE IF NOT EXISTS entity_mentions (
  id BIGSERIAL PRIMARY KEY,
  entity_name TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('Topics', 'Markets', 'People', 'Companies', 'Policies')),
  article_id UUID REFERENCES articles(id) ON DELETE CASCADE,
  mentioned_at TIMESTAMPTZ NOT NULL
);

-- HeatScore cache
CREATE TABLE IF NOT EXISTS heat_scores (
  entity_name TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  heat_score NUMERIC NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_primary_topic ON articles(primary_topic_key);
CREATE INDEX IF NOT EXISTS idx_articles_sentiment ON articles(sentiment);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_entity ON entity_mentions(entity_name, mentioned_at);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_article ON entity_mentions(article_id);
CREATE INDEX IF NOT EXISTS idx_heat_scores_score ON heat_scores(heat_score DESC);

-- Semantic search RPC function
CREATE OR REPLACE FUNCTION match_articles(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  url TEXT,
  headline TEXT,
  summary TEXT,
  source TEXT,
  image_url TEXT,
  published_at TIMESTAMPTZ,
  sentiment TEXT,
  magnitude NUMERIC,
  primary_topic_key TEXT,
  primary_topic_display TEXT,
  entities_topics TEXT[],
  entities_markets TEXT[],
  entities_people TEXT[],
  entities_companies TEXT[],
  entities_policies TEXT[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.url,
    a.headline,
    a.summary,
    a.source,
    a.image_url,
    a.published_at,
    a.sentiment,
    a.magnitude,
    a.primary_topic_key,
    a.primary_topic_display,
    a.entities_topics,
    a.entities_markets,
    a.entities_people,
    a.entities_companies,
    a.entities_policies,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM articles a
  WHERE a.embedding IS NOT NULL
    AND 1 - (a.embedding <=> query_embedding) > match_threshold
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to compute cosine similarity between two articles
CREATE OR REPLACE FUNCTION article_similarity(
  article_id_a UUID,
  article_id_b UUID
)
RETURNS float
LANGUAGE plpgsql
AS $$
DECLARE
  sim float;
BEGIN
  SELECT 1 - (a.embedding <=> b.embedding) INTO sim
  FROM articles a, articles b
  WHERE a.id = article_id_a AND b.id = article_id_b
    AND a.embedding IS NOT NULL AND b.embedding IS NOT NULL;
  RETURN COALESCE(sim, 0);
END;
$$;

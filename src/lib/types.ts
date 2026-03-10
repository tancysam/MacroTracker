export interface MarketImpact {
  asset: string;
  direction: "up" | "down" | "mixed";
}

export interface Article {
  id: string;
  url: string;
  url_hash: string;
  headline: string;
  summary: string | null;
  source: string | null;
  image_url: string | null;
  published_at: string;
  created_at: string;
  sentiment: "Bullish" | "Bearish" | "Neutral";
  magnitude: number;
  primary_topic_key: string | null;
  primary_topic_display: string | null;
  entities_topics: string[];
  entities_markets: string[];
  entities_people: string[];
  entities_companies: string[];
  entities_policies: string[];
  embedding?: number[];
  market_impacts: MarketImpact[] | null;
  taxonomy_tags: string[];
}

export interface HeatScoreEntry {
  entity_name: string;
  entity_type: string;
  heat_score: number;
  computed_at: string;
}

export interface AssociationNode {
  id: string;
  label: string;
  type: "focus" | "companies" | "people" | "policies" | "markets" | "topics";
  magnitude: number;
  sentiment: number;
  linkScore: number;
  source: string | null;
  date: string;
  headline: string;
  summary: string | null;
  entities: {
    companies: string[];
    people: string[];
    policies: string[];
    markets: string[];
    topics: string[];
  };
  breakdown: {
    semantic: number;
    entity: number;
    magnitude: number;
    sentiment: number;
  };
  level: number;
  articleId?: string;
  // D3 SimulationNodeDatum fields
  index?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface AssociationEdge {
  source: string;
  target: string;
  score: number;
  sharedEntities?: string[];
}

export type AssociationMode = "broad" | "strict";
export type AssociationsView = "evidence" | "graph";

export interface AssociationEvidence {
  shared_entities_by_type: Record<string, string[]>;
  shared_entity_count: number;
  semantic_similarity: number;
  entity_overlap: number;
  magnitude_proximity: number;
  sentiment_alignment: number;
  temporal_context: number;
  temporal_relation: "preceded" | "followed" | "same_day";
  source_article_ids: string[];
}

export interface RelatedAssociationEvent {
  article_id: string;
  headline: string;
  summary: string | null;
  source: string | null;
  published_at: string;
  sentiment: Sentiment;
  magnitude: number;
  dominant_type: EntityType;
  link_score: number;
  explanation: string[];
  evidence: AssociationEvidence;
}

export interface AssociationTraceNode {
  article_id: string;
  headline: string;
  published_at: string;
  source: string | null;
  link_score: number;
  why_it_matters: string;
}

export interface AssociationTracePath {
  path_id: string;
  root_event_id: string;
  nodes: AssociationTraceNode[];
  total_score: number;
}

export interface AssociationsResponseV2 {
  focus: Article;
  related_events: RelatedAssociationEvent[];
  trace_paths: AssociationTracePath[];
  scoring_version: string;
  applied_params: {
    time_window: TimeWindow;
    sentiment: Sentiment | "All";
    mode: AssociationMode;
    depth: number;
    view: AssociationsView;
    link_threshold: number;
    entity_types: string[];
    max_related: number;
  };
  generated_at: string;
  // Legacy compatibility payload
  focusArticle?: Article;
  nodes?: AssociationNode[];
  edges?: AssociationEdge[];
}

export interface MarketCandle {
  c: number[]; // close
  h: number[]; // high
  l: number[]; // low
  o: number[]; // open
  t: number[]; // timestamp
  v: number[]; // volume
  s: string;   // status
}

export type Sentiment = "Bullish" | "Bearish" | "Neutral";
export type SortMode = "recency" | "magnitude";
export type TimeWindow = "7D" | "1M" | "3M" | "6M";
export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "ALL";
export type EntityType = "companies" | "people" | "policies" | "markets" | "topics";

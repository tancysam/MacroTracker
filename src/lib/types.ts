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
  type: "focus" | "companies" | "people" | "policies" | "markets";
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
export type SortMode = "heatscore" | "recency" | "composite";
export type TimeWindow = "7D" | "1M" | "3M" | "6M";
export type TimeRange = "1M" | "3M" | "6M" | "1Y" | "ALL";
export type EntityType = "companies" | "people" | "policies" | "markets";

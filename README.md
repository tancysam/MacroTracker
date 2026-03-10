# MacroTracker

MacroTracker is a macroeconomic news intelligence platform built for asset managers. It ingests live financial news, enriches each article with AI-extracted metadata, computes trending entity heat scores, and surfaces three interconnected analysis views — Dashboard, Timeline, and Associations.

---

## The Problem

Asset managers are flooded with market-moving news: macro releases, central bank commentary, geopolitical events. Monitoring is largely manual and keyword-driven. MacroTracker cuts through the noise by scoring, ranking, and linking events so analysts can find what matters and trace how it connects to everything else.

---

## Core Features

### AI Enrichment Pipeline

Every ingested article is processed by OpenAI in a single prompt that extracts:

- **Sentiment** — `Bullish`, `Bearish`, or `Neutral`
- **Magnitude Score** (0–10) — LLM-assigned impact rating
- **Entities** — categorised across Topics, Markets, People, Companies, and Policies
- **Primary Topic** — the most-mentioned entity, stored as both a DB key (`primary_topic_key`) and a human-readable display label (`primary_topic_display`) for Timeline headers

A `text-embedding-3-small` vector is also generated per article for semantic retrieval.

### Heat Score (Trending)

Trending entities are ranked by HeatScore — a momentum signal:

```
heatScore = (mentions_this_week - mentions_last_week) / mentions_last_week × 100
```

Computed on a schedule and cached. Drives the Trending panel on the Dashboard and the composite article sort.

### Composite Article Ranking

The default Dashboard sort blends trend momentum with recency:

```
composite = 0.6 × norm(heatScore) + 0.4 × exp(−hours_since_published / 24)
```

HeatScore is normalised 0→1 across the current feed. Recency decays by half every 24 hours.

### LinkScore (Associations Graph)

When a user opens the Associations view, MacroTracker scores every candidate article against the focus article using a deterministic weighted formula:

```
linkScore = 0.4 × semantic_similarity
           + 0.3 × entity_overlap
           + 0.2 × magnitude_proximity
           + 0.1 × sentiment_match
```

The top 5 connected articles are selected. Active filters (entity type, time window, sentiment, link threshold) affect both the candidate pool and how each component is scored — results are consistent for identical inputs.

### AI Chat Assistant

A floating chat assistant (MacroTracker AI) is available on all pages. Powered by OpenAI, it answers macroeconomic questions, explains market concepts, and links directly to relevant Timeline or Associations views within the platform.

---

## Pages

### Dashboard

The landing page. News feed ranked by composite sort with:

- **Left sidebar** — single-select topic chip filters (All News, Tech, Energy, Fed, ECB, Inflation, Labor, Crypto, etc.)
- **Sort modes** — Composite (default), HeatScore, Recency
- **News cards** — thumbnail, source, time, sentiment badge, magnitude score, headline, entity hashtags
- **Hover actions** on each card: "Timeline →" and "Associations →"
- **Right panel** — top trending entities ranked by HeatScore, each clickable to navigate to their Timeline

### Timeline

Scoped to a primary topic. Accessed by clicking "Timeline →" on any news card or a trending entity.

- **Price chart** (top) — line chart of a user-selected market instrument (US 10Y Yield, S&P 500, EUR/USD, Gold, Brent Crude, DXY) with event bubbles overlaid at article dates. Time axes and value axes displayed. Time range: 1M / 3M / 6M / 1Y / ALL
- **News feed** (bottom) — chronological list of articles for that topic, filterable by sentiment (All / Bullish / Bearish / Neutral). Each card has a "View Associations →" link.

### Associations

An interactive D3 force-directed graph anchored to a focus article.

- Focus node shown in amber/gold at the centre
- Connected nodes sized by Magnitude Score; colour-coded by the dominant entity type driving the link (Companies=blue, People=purple, Policies=green, Markets=orange)
- Edge colour indicates sentiment alignment: green (aligned), red (opposing), grey (neutral)
- **Sliding-window expansion** — clicking a node reveals its top 5 linked articles as a new level. When a 4th level would appear, the oldest ring is removed. Maximum 3 levels on screen at any time
- **Left filter panel** — entity type toggles, time window (7D / 1M / 3M / 6M), sentiment filter, link threshold slider (0.4–0.95)
- **Right detail panel** — headline, source, date, magnitude, sentiment, linkScore component breakdown bars, key entities

### Semantic Search

Available from the nav header on all pages. Queries are vectorised and matched against stored article embeddings via Supabase pgvector. Results slide in as an overlay panel without navigating away. Each result has the same Timeline / Associations actions as Dashboard cards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS v4 (dark theme only) |
| Database | Supabase — PostgreSQL + pgvector |
| AI | OpenAI `gpt-4o-mini` (extraction), `text-embedding-3-small` (embeddings) |
| News ingestion | Finnhub (general news endpoint) |
| Market data | Twelve Data (daily candles, stored in `market_candles` table) |
| Graph rendering | D3.js force-directed graph |
| Hosting | Vercel |

---

## Architecture

### Data Flow

```
Finnhub news → /api/ingest → OpenAI (entities + sentiment + magnitude + embedding)
                           → Supabase (articles, entity_mentions, embeddings)

Twelve Data candles → /api/market-candles/backfill  (historical, one-time)
                    → /api/market-candles/refresh    (incremental, scheduled)
                    → Supabase market_candles table  → served to PriceChart

Entity mention counts → /api/compute-heat-scores → heat_scores table → Dashboard trending panel

User query → /api/search → pgvector match_articles RPC → ranked results overlay
Focus article → /api/articles/[id]/associations → linkScore computation → D3 graph
User message → /api/chat → OpenAI → MacroTracker AI response
```

### API Routes

| Route | Purpose |
|---|---|
| `POST /api/ingest` | Fetch Finnhub news, deduplicate by `url_hash`, enrich via OpenAI, store in Supabase |
| `GET /api/articles` | Dashboard feed with `topic`, `sort`, `limit` params |
| `GET /api/articles/timeline` | Articles filtered by `primary_topic_key` + optional sentiment |
| `GET /api/articles/[id]/associations` | Compute linkScore for candidates; return top 5 nodes + cross-edges |
| `GET /api/compute-heat-scores` | Compute and cache entity HeatScores |
| `GET /api/heat-scores` | Return cached HeatScores |
| `GET /api/market-candles/backfill` | Historical candle backfill (2015–present) for all instruments |
| `GET /api/market-candles/refresh` | Incremental candle update from last stored date |
| `GET /api/market-data` | Legacy market data proxy (server-side cached 15 min) |
| `POST /api/search` | Semantic search via pgvector `match_articles` RPC |
| `POST /api/chat` | AI chat assistant powered by OpenAI |

### Supabase Schema

- `articles` — all article data including `url_hash` (unique dedup constraint) and `embedding` (pgvector)
- `entity_mentions` — per-article entity tags with type and count
- `heat_scores` — cached HeatScore computation results
- `market_candles` — OHLCV rows keyed by `(symbol, date)`
- `match_articles(...)` — pgvector RPC for semantic search
- `article_similarity(...)` — vector similarity helper

---

## Setup

### Prerequisites

- Node.js 20+
- Supabase project
- OpenAI API key
- Finnhub API key
- Twelve Data API key

### Environment Variables

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
FINNHUB_API_KEY=
TWELVE_DATA_API_KEY=
```

`SUPABASE_SERVICE_ROLE_KEY` is required for ingestion, heat score compute, and market candle routes. Never expose it in client code.

### Database

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor. This sets up all tables, indexes, the `vector` extension, and the `match_articles` RPC.

### Local Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run lint       # ESLint
```

### Seeding Market Data

To populate the price chart with historical data, call the backfill endpoint once:

```bash
curl http://localhost:3000/api/market-candles/backfill
```

Subsequent scheduled runs use `/api/market-candles/refresh` to fetch only new rows.

### Ingesting News

```bash
curl -X POST http://localhost:3000/api/ingest
```

Processes up to 30 articles per run in batches of 10. Deduplication is handled by a single `INSERT ... ON CONFLICT (url_hash) DO NOTHING` — cross-source duplicates are kept as separate articles for broader coverage.

---

## Scheduled Jobs

Configured for Vercel cron:

| Job | Cadence |
|---|---|
| `/api/ingest` | Every 2 hours |
| `/api/compute-heat-scores` | Every 15 minutes |
| `/api/market-candles/refresh` | Daily |

---

## Repository Structure

```
src/
  app/
    api/                           # All API routes
      articles/                    # Feed + timeline + associations
      chat/                        # AI assistant
      compute-heat-scores/
      heat-scores/
      ingest/
      market-candles/
        backfill/                  # One-time historical load
        refresh/                   # Incremental daily update
      market-data/
      search/
    associations/page.tsx
    timeline/page.tsx
    page.tsx                       # Dashboard
  components/
    AssociationGraph.tsx           # D3 force-directed graph
    ChatBot.tsx                    # Floating AI assistant
    FocusArticleBar.tsx
    NavHeader.tsx
    NewsCard.tsx / TimelineCard.tsx
    PriceChart.tsx                 # Candle line chart with event bubbles
    SearchPanel.tsx
    TrendingPanel.tsx
    TopicChips.tsx
  lib/
    types.ts                       # Shared TypeScript types
    constants.ts                   # Topic chips, instrument configs, color maps
    supabase.ts                    # Client singletons
    finnhub.ts                     # News fetching
    twelvedata.ts                  # Market candle fetching
    openai.ts                      # Embeddings + metadata extraction
supabase/
  migrations/
    001_initial_schema.sql
```

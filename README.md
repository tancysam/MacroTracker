# MacroTracker

MacroTracker is a macroeconomic news intelligence platform built for asset managers. It ingests live financial news, enriches each article with AI-extracted metadata, computes trending entity heat scores, and surfaces three interconnected analysis views — Dashboard, Timeline, and Associations.

<img width="1909" height="977" alt="image" src="https://github.com/user-attachments/assets/5fda3df6-fde5-41e0-b558-c740b2f0b990" />

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

Trending entities are ranked by HeatScore — a momentum signal combining recency weighting and logarithmic amplification:

```
heatScore = (weighted_mentions_this_week - mentions_last_week) × ln(1 + weighted_mentions_this_week)
```

Where mentions in the current week are decayed by a factor of 0.85 per day (recent mentions count more). Computed every 15 minutes and cached. Drives the Trending panel on the Dashboard and the composite article sort.

### Dashboard Article Sorting

The Dashboard provides two sort modes:

- **Recency** — articles sorted by publication date, newest first
- **Magnitude** — articles sorted by impact severity (0–10 LLM-assigned score), highest first

### LinkScore (Associations Graph)

When a user opens the Associations view, MacroTracker scores every candidate article against the focus article using a six-component weighted formula. Weights vary by association mode:

**Broad mode** (0.30 threshold, 8 results):
```
linkScore = 0.30 × semantic_similarity + 0.22 × entity_overlap + 0.13 × magnitude_proximity
          + 0.10 × sentiment_match + 0.15 × temporal_context + 0.10 × market_impact_alignment
```

**Balanced mode** (0.48 threshold, 6 results):
```
linkScore = 0.32 × semantic_similarity + 0.24 × entity_overlap + 0.13 × magnitude_proximity
          + 0.10 × sentiment_match + 0.10 × temporal_context + 0.11 × market_impact_alignment
```

**Strict mode** (0.65 threshold, 5 results):
```
linkScore = 0.35 × semantic_similarity + 0.25 × entity_overlap + 0.13 × magnitude_proximity
          + 0.10 × sentiment_match + 0.05 × temporal_context + 0.12 × market_impact_alignment
```

Temporal context rewards earlier events (same-day=0.6, progressing backward in time) and penalizes later events (max 0.35). Market impact alignment scores shared or aligned instrument directionality. Active filters (entity type, time window, sentiment, link threshold) affect both the candidate pool and scoring — results are consistent for identical inputs.

### AI Chat Assistant (RAG-Powered)

A floating chat assistant (MacroTracker AI) is available on all pages. It goes beyond a generic LLM by combining **Retrieval-Augmented Generation (RAG)** with platform-aware navigation:

- **RAG pipeline** — every user query is embedded via `text-embedding-3-small` and matched against all stored article vectors in Supabase pgvector. The most semantically relevant articles are retrieved and injected into the model context before a response is generated. This grounds answers in real ingested news, dramatically reducing hallucinations and increasing factual accuracy for macro questions.
- **Grounded responses** — the assistant explicitly distinguishes between claims backed by retrieved articles and general framework knowledge, and will surface article headlines, sources, and publication dates as evidence.
- **Platform navigation** — responses include direct Markdown links to relevant Dashboard, Timeline, Associations, or Article Detail views so analysts can jump straight to the underlying source material.
- **Chat History & Institutional Memory** — authenticated users' conversations are persisted in the Supabase `chat_sessions` table. A **Chat History panel** lets users browse, reload, and continue previous sessions. Because the entire article database is also permanent, the assistant can answer questions about events from months ago with the same fidelity as today's news — forming a continuous institutional memory layer over the platform.

---

## Pages

### Dashboard

The landing page. News feed sortable by topic and importance:

- **Left sidebar** — single-select topic chip filters (All News, Tech, Energy, Fed, ECB, Inflation, Labor, Crypto, etc.)
- **Sort modes** — Recency (default), Magnitude
- **Magnitude filters** — Any, High (7+), Critical (9+)
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

### Article Detail

Each article has a dedicated detail page (`/article/[id]`) providing:

- Full headline, summary, source, publication date, sentiment badge, and magnitude score
- **Market Impacts** panel — AI-derived risk implications mapped to specific instruments (equities, rates, FX, commodities)
- Entity tags broken down by type
- Direct links to the article's Timeline and Associations views

### Semantic Search

Available from the nav header on all pages. Queries are vectorised and matched against stored article embeddings via Supabase pgvector. Results slide in as an overlay panel without navigating away. Each result has the same Timeline / Associations actions as Dashboard cards.

### Authentication & User Accounts

Supabase Auth (email/password) gates personal features:

- Secure login at `/login` with email confirmation flow
- Password update via `/auth/update-password`
- Chat history and session storage are scoped per authenticated user — each analyst maintains their own institutional memory

---

## Hackathon Criteria

MacroTracker was designed to meet every element of the challenge brief:

### Track how a particular topic evolves over time

The **Timeline** page is built specifically for this. Any topic, entity, or trending term can be opened as a scoped news timeline showing every ingested article for that topic in chronological order. A live market price chart (equities, rates, FX, commodities) is overlaid with event bubbles at the exact publication dates of relevant articles, letting analysts see at a glance how price action responded to breaking news. Sentiment filters (Bullish / Bearish / Neutral) further isolate directional narrative shifts over the chosen period (1M / 3M / 6M / 1Y / ALL).

### Identify when a theme becomes "hot" or "cool"

The **HeatScore** system provides a quantitative momentum signal per entity:

```
heatScore = (weighted_mentions_this_week - mentions_last_week) × ln(1 + weighted_mentions_this_week)
```

Where recent mentions are weighted more heavily (daily decay factor 0.85). Computed every 15 minutes and surfaced in the **Trending panel** on the Dashboard, HeatScore ranks every tracked entity — companies, people, markets, policies, topics — by how rapidly it is accelerating or decelerating in news coverage. The composite article sort (`0.6 × norm(heatScore) + 0.4 × recency_decay`) ensures the most momentum-loaded stories surface at the top of the feed automatically.

### Connect related developments across regions or asset classes

The **Associations graph** maps cross-cutting linkages between any two articles using a six-component weighted formula with mode-specific thresholds. The formula combines:

- **Semantic similarity** (0.30–0.35 weight) — deep vector embeddings via pgvector
- **Entity overlap** (0.22–0.25) — shared companies, people, markets, policies, topics  
- **Magnitude proximity** (0.13) — alignment of event severity
- **Sentiment match** (0.10) — alignment of directional bias (Bullish/Bearish/Neutral)
- **Temporal context** (0.05–0.15) — rewards preceding events, penalizes later ones
- **Market impact alignment** (0.10–0.12) — shared or aligned instrument directionality

Because similarity is computed over dense embeddings rather than keyword overlap, the engine surfaces thematic connections that span geographies and asset classes — e.g. linking a Fed rate decision to an EM currency stress article even when no single keyword is shared. Three association modes (Broad, Balanced, Strict) tune sensitivity and specificity. The sliding-window expansion mechanic (max 3 levels deep) lets analysts trace chains of related events without the graph becoming unreadable.

### Maintain institutional memory of past discussions

Institutional memory is built into the platform at two levels:

1. **Persistent article database** — every ingested article and its full metadata (entities, sentiment, magnitude, embedding) is stored permanently in Supabase. The AI assistant and semantic search can surface articles from months ago with identical fidelity to today's news.
2. **RAG-powered chat history** — the AI Chat assistant persists each user's conversation sessions in the `chat_sessions` table. Analysts can return to prior research threads, reload context, and continue where they left off. Because the assistant retrieves supporting evidence from the article database at query time, answers about past macro events are grounded in the original source material rather than model memory alone.

### Provide an intuitive dashboard to allow users to navigate and reference source articles as required

The **Dashboard** is the central navigation hub: topic chip filters scope the feed instantly, composite ranking ensures nothing important is buried, and every news card exposes one-click actions to open the full article detail, its Timeline, or its Associations graph. The **Semantic Search** overlay (available on every page) lets users retrieve past articles by describing the event in natural language. The **Article Detail** page consolidates the full article text, AI-extracted entities, market impact analysis, and navigation links in one place.

### Propose risk implications of each macro theme

The **Article Detail** page includes an AI-generated **Market Impacts** panel that maps each article's findings to instrument-level risk implications across equities, rates, FX, and commodities. The **Magnitude Score** (0–10, LLM-assigned) attached to every article provides a consistent, comparable severity signal across the entire dataset. The **AI Chat assistant** (RAG-powered — see above) can be queried directly: _"What are the rate risk implications of the latest ECB commentary?"_ and will ground its answer in the actual retrieved articles.

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

# MacroTracker

## Context

Asset Managers already have lots of market-moving news, macroeconomic releases, and central bank commentary. Monitoring is largely manual, dependent on keyword alerts. We should create a product that helps them sieve out the more important news and investigate how events interlink with other events.

---

## Tech Stack

- **Database:** Supabase (PostgreSQL + pgvector for semantic search)
- **Hosting:** Vercel
- **AI:** OpenAI API (LLMs for entity extraction + Embeddings for semantic similarity)
- **Frontend:** React + Node.js
- **News + Market Data API:** Finnhub (news endpoints for article ingestion; candle/quote endpoints for market price charts — free tier: 60 API calls/min)
- **Knowledge Graph Visualization:** D3.js (force-directed graph)
- **Authentication:** None — single shared view, no login required

---

## Entity Taxonomy

Each news article is tagged and stored with the following entity types:

| Entity Type | Description |
|---|---|
| **Topics** | Broad thematic categories (e.g., Inflation, Labor Market, Geopolitics) |
| **Markets** | Financial instruments or assets (e.g., S&P 500, Brent Crude, US 10Y Yield) |
| **People** | Named individuals of relevance (e.g., Jerome Powell, Christine Lagarde) |
| **Companies** | Corporations or institutions (e.g., Goldman Sachs, Federal Reserve, ECB) |
| **Policies** | All policy types — monetary, fiscal, regulatory (e.g., Rate Hike, QE, Tariffs) |

---

## Sentiment Labels

Sentiment is always expressed as one of three states across all pages and features:

- **Bullish** — positive market outlook
- **Bearish** — negative market outlook
- **Neutral** — mixed or no directional signal

---

## Magnitude Score

Each article receives a numeric **Magnitude Score** (0–10) representing the significance/impact of the event. This score is:
- Displayed numerically on all article cards and detail panels
- Used to determine node size in the Associations graph
- Used in the linkScore formula (magnitude_proximity component)

There are no text labels (e.g., "High Impact / Medium Impact") — only the numeric score is displayed.

---

## Heat Score (Trending)

Trending entities are ranked by **HeatScore** — a measure of how much more frequently an entity is appearing in news this week vs last week:

```
heatScore = (mentions_this_week - mentions_last_week) / mentions_last_week * 100
```

- Computed server-side on a schedule (every 15–30 minutes), result is cached
- Displayed in the Dashboard right panel as an **absolute HeatScore value** (not market price % change)
- Entities ranked include: companies, people, markets, and policy topics extracted from news

---

## User Flow & Pages

### 1. Dashboard (Landing Page)

The first page the user lands on. Displays a ranked list of the latest news articles in trending order (by HeatScore of their tagged entities).

**Left Sidebar — Focus Topics:**
- Chip-style filter buttons for topic categories (e.g., All News, Tech, Energy, Fed, ECB, Inflation, Labor, Crypto)
- Selecting a chip filters the news feed to that industry/topic in trending order

**Main Feed:**
- News cards showing: Thumbnail image, Source, Time, Sentiment badge (Bullish/Bearish/Neutral), **Magnitude score**, Headline, Entity hashtags
- **Sort control (user-selectable):** HeatScore | Recency | Composite (default)
- **Composite sort formula:** `composite = 0.6 × norm(heatScore) + 0.4 × exp(-hours_since_published / 24)`  
  *(HeatScore is normalized 0→1 across current feed; recency decays by half every 24 hours)*
- **Clicking a news card reveals two actions (on hover):**
  - **"Timeline →"** — navigates to the Timeline page scoped to that article's primary topic
  - **"Associations →"** — navigates to the Associations page with that article as the focus
- Topic chip filters are **single-select** (one active topic at a time); selecting a chip instantly filters the feed client-side

**Search Bar (all pages):**
- Present in the nav header on all three pages
- Full-text **semantic search** via Supabase pgvector — searches across article headlines and summaries
- On submit, a **search results panel slides in** over the current view (does not navigate away)
- Results ranked by semantic similarity; each result card has the same Timeline/Associations actions as Dashboard cards
- Panel can be closed to return to the previous view

**Right Panel — Trending & Top Entities:**
- Lists the top trending entities (Companies, People, Markets, Policies) ranked by HeatScore
- Shows the absolute HeatScore value next to each entity with a progress bar
- **Each entity row is clickable** — clicking navigates to the Timeline page scoped to that entity as its primary topic

---

### 2. Timeline Subpage

Accessed by clicking **"Timeline →"** on a news card (from Dashboard). Opens the Timeline scoped to the **primary topic** of that article.

> **Primary Topic Assignment:** The article's primary topic is the **most-mentioned entity tag** across all entity types. In case of a tie, the entity with the highest Magnitude contribution is used. This field is stored as `primary_topic` on the article record.

**Top section — Price Chart:**
- A line chart of a market instrument relevant to the topic
- **The user manually selects which market instrument to overlay** from a dropdown (options: US 10Y Yield, S&P 500, EUR/USD, Gold, Brent Crude, DXY Index)
- Market OHLC data fetched from **Finnhub candle endpoint** for the selected instrument
- Time range selector: 1M, 3M, 6M, 1Y, ALL
- Event bubbles overlaid at dates where relevant news articles landed, showing price change at that point

**Bottom section — News Timeline Feed:**
- Vertical scrollable list of news cards for that topic, ordered chronologically (newest first)
- Each card shows: Date, Sentiment badge (Bullish/Bearish/Neutral), Magnitude Score (numeric), Source, Headline, Summary paragraph, Entity hashtags, People tagged
- Sentiment filter above the feed: All / Bullish / Bearish / Neutral
- **Each card shows "View Associations →"** — clicking opens the Associations page with that article as focus

---

### 3. Associations Subpage

Accessed by clicking **"Associations →"** on any news card from the **Dashboard** or the **Timeline**. The clicked article becomes the **focus article**.

**Focus Article Bar (top — simplified):**
- Slim bar displaying: headline, source, date, Magnitude Score, Sentiment badge
- **Back navigation button** (←) returns the user to the previous page
- *(No Global Benchmark / YTD Spread market data — removed as not meaningful in context)*

**Graph Area (center):**
- D3.js force-directed graph
- Focus article = large central node (amber/gold)
- **Initial state: Focus node + top 5 connected article nodes**
- Connected article nodes sized by their Magnitude Score
- **Node color = the entity type with the highest contribution to the linkScore for that connection**  
  (Companies=blue, People=purple, Policies=green, Markets=orange)
- Edge color = sentiment alignment (green=aligned, red=opposing, grey=neutral)
- **Expansion mechanic — sliding window, max 3 levels deep:**
  - Clicking a node opens its detail panel + shows **"⊕ EXPAND ON THIS"** button
  - Clicking Expand makes that node the new hub; its top 5 linked articles are added as a new level
  - When a 4th level would be introduced, **level 1 nodes (original focus ring) are removed** — only 3 levels remain on screen at any time
  - This sliding-window approach keeps the graph readable at all times

**Left Filter Panel:**
- **Entity Filters:** Toggle Companies, People, Policies, Markets on/off → affects which articles are in the candidate pool AND how entity_overlap is scored
- **Time Window:** 7D / 1M / 3M / 6M
- **Sentiment Filter:** All / Bearish / Bullish / Neutral
- **Link Threshold:** Slider (0.4 to 0.95) — minimum linkScore required to show a connection

**Right Detail Panel:**
- Shows on clicking any node in the graph
- Displays: article headline, source, date, Magnitude Score, Sentiment score (numeric), Link Score Breakdown (4 component bars), Key Entities
- **"Expand on this" button** — loads additional linked articles branching from the selected node

---

## Backend Architecture

### News Ingestion Flow

1. **Scheduled poll every 2 hours** — cron job calls Finnhub news endpoints
2. **Deduplication:** `INSERT INTO articles ... ON CONFLICT (url_hash) DO NOTHING` — a single SQL one-liner. No complex logic needed. Each article's URL is hashed on ingest; if the URL already exists in the DB, the row is silently skipped. Cross-source duplicates (same story, different outlet) are treated as **separate articles** — each gets its own card, vector and entity extraction. This is acceptable for the hackathon as it actually increases breadth of coverage and perspective.
3. OpenAI Embeddings generates a vector per article → stored in Supabase pgvector
4. OpenAI LLM extracts per-article metadata in a single prompt:
   - Entity tags (Companies, People, Policies, Markets, Topics)
   - Sentiment label (Bullish / Bearish / Neutral)
   - **Magnitude Score (0–10):** LLM-assigned, rated as part of the extraction prompt
   - **`primary_topic_display`:** LLM-generated human-readable topic name (e.g., *"Federal Reserve Rate Policy"*) derived from the most-mentioned entity. Used as the Timeline page heading.
   - **`primary_topic_key`:** The raw most-mentioned entity tag (e.g., *"Federal Reserve"*) used for DB filtering/grouping
5. All metadata + vectors persisted to Supabase (permanent institutional memory)

### Market Price Data Flow

- **Source:** Finnhub candle/quote endpoints (same API key, free tier)
- Fetched **on demand** when a user opens the Timeline and selects a market instrument
- Finnhub supports: stock candles (`/stock/candle`), forex candles (`/forex/candle`), crypto candles (`/crypto/candle`)
- Data is **not pre-cached** — fetched per user request and optionally cached server-side for 15 minutes to stay within Finnhub free-tier rate limits (60 calls/min)

### Semantic Search & Association

- When computing associations for a focus article, Supabase pgvector is used for semantic similarity search over historical articles
- Every processed article and all its metadata is stored permanently (institutional memory)

### HeatScore Computation

- Run as a scheduled server-side job every 15–30 minutes
- Compares entity mention frequency this week vs last week
- Result cached and served to Dashboard

---

## Linkage Formula (Associations)

```
linkScore = 0.4 * semantic_similarity
          + 0.3 * shared_entities
          + 0.2 * magnitude_proximity
          + 0.1 * sentiment_match
```

### Linkage Process (3 Steps)

**Step 1 — Pre-filter the candidate pool:**
- Time window filter → removes articles outside the date range
- Sentiment filter → removes articles that don't match selected sentiment
- Entity type filter → removes articles with zero overlap with active entity types

**Step 2 — Compute linkScore on filtered candidates:**
- linkScore formula runs only on articles that survived Step 1
- entity_overlap component also respects active filters (e.g., if "People" is toggled off, shared people don't contribute to entity_overlap score)

**Step 3 — Select top 5:**
- Top 5 linked articles are selected from the filtered pool
- Rankings change based on active filters — this is by design
- Linkages are **deterministic, not probabilistic** (consistent results for same inputs)

---

## Hackathon Scope

All three pages must be **fully functional end-to-end** — no static mocks:
- Live news ingestion from Finnhub (2-hour polling)
- Real-time entity/sentiment/magnitude extraction via OpenAI
- Supabase pgvector for storage and semantic search
- Functional D3 graph with filtering on the Associations page
- Live HeatScore trending on the Dashboard
- Working Timeline with Finnhub-powered market chart overlay
- Semantic search across all articles via pgvector

---

## Resolved Design Decisions

| Topic | Decision |
|---|---|
| Sentiment labels | `Bullish / Bearish / Neutral` universally across all pages |
| Market data source | Finnhub (same key as news) — candle endpoints |
| Auth | None — no login required; profile avatars are decorative |
| Navigation bells | Removed — notification bell removed from all nav bars |
| Magnitude display | Shown on Dashboard cards, Timeline cards, and Associations nodes/panel |
| Search | Semantic search via Supabase pgvector; results appear as a slide-in panel |
| News ingestion cadence | Every 2 hours (cron job) |
| Deduplication | `INSERT ... ON CONFLICT (url_hash) DO NOTHING` — trivial SQL one-liner; cross-source duplicates kept as separate articles |
| Composite sort formula | `0.6 × norm(heatScore) + 0.4 × exp(-hours/24)` |
| Expand depth limit | Max 3 levels on screen at once (sliding window — oldest level removed when new one is added) |
| Primary topic | Most-mentioned entity tag → `primary_topic_key` (DB filter) + `primary_topic_display` (LLM-generated human label for Timeline header) |
| Timeline topic heading | LLM-generated display name (e.g., "Federal Reserve Rate Policy"), stored as `primary_topic_display` |
| Associations stat bar | Removed — replaced with slim focus article bar + back button only |
| Trending panel entities | Clickable — navigates to Timeline scoped to that entity |
| Saved Views | Removed |
| Insight of the Day | Removed |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MacroTracker is a macroeconomic news intelligence platform for asset managers. It ingests financial news from Finnhub, extracts entities/sentiment/magnitude via OpenAI, stores everything in Supabase (with pgvector for semantic search), and presents three interconnected views: Dashboard, Timeline, and Associations graph.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

No test framework is configured.

## Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `FINNHUB_API_KEY`

## Tech Stack

- **Next.js 16** (App Router) with React 19, TypeScript, Tailwind CSS v4
- **Supabase** — PostgreSQL + pgvector for articles, entity mentions, heat scores, and semantic search
- **OpenAI** — `gpt-4o-mini` for entity/sentiment extraction, `text-embedding-3-small` for embeddings
- **Finnhub** — news ingestion + market candle data (free tier, 60 calls/min)
- **D3.js** — force-directed association graph

## Architecture

### Pages (App Router)

- `/` — **Dashboard**: news feed with topic chip filters (left sidebar), sort modes (composite/heatscore/recency), trending entities panel (right)
- `/timeline?topic=X` — **Timeline**: price chart overlay (Finnhub candles) + chronological news feed for a primary topic, with sentiment filter
- `/associations?article=ID` — **Associations**: D3 force-directed graph showing article relationships via linkScore, with filter panel (entity types, time window, sentiment, link threshold) and detail panel with expand mechanic (sliding window, max 3 levels)

### API Routes (`src/app/api/`)

- `POST /api/ingest` — Fetches Finnhub news, deduplicates via `url_hash`, extracts metadata via OpenAI, generates embeddings, stores in Supabase. Also handles `GET` for Vercel cron compatibility. Processes max 30 articles in batches of 10.
- `GET /api/articles` — Fetches articles with topic filtering and 3 sort modes. Composite sort: `0.6 * norm(heatScore) + 0.4 * exp(-hours/24)`
- `GET /api/articles/timeline` — Articles filtered by `primary_topic_key` with optional sentiment filter
- `GET /api/articles/[id]/associations` — Computes linkScore for candidate articles: `0.4*semantic + 0.3*entity_overlap + 0.2*magnitude_proximity + 0.1*sentiment_match`. Returns top 5 nodes + cross-edges.
- `GET /api/compute-heat-scores` — Computes entity heat scores (mention frequency this week vs last week); called by cron every 15–30 minutes
- `GET /api/heat-scores` — Returns cached heat scores
- `GET /api/market-data` — Proxies Finnhub candle requests; responses cached server-side for 15 minutes to stay within the 60 calls/min free-tier limit
- `GET /api/search` — Semantic search via pgvector

### Lib (`src/lib/`)

- `types.ts` — All shared TypeScript types (Article, AssociationNode, AssociationEdge, HeatScoreEntry, MarketCandle, etc.)
- `constants.ts` — Topic chips, market instrument configs (Finnhub symbols), entity type colors, sentiment colors, topic keywords for filtering, time window day mappings
- `supabase.ts` — Client singleton (`getSupabase()` for anon, `getServiceClient()` for service role)
- `finnhub.ts` — News fetching + market candle fetching (stock/forex/crypto endpoints)
- `openai.ts` — Embedding generation + article metadata extraction prompt

### Key Components (`src/components/`)

- `AssociationGraph.tsx` — D3 force-directed graph with node sizing by magnitude, color by entity type, edge color by sentiment alignment
- `GraphFilterPanel.tsx` / `GraphDetailPanel.tsx` — Associations page filter and node detail panels
- `FocusArticleBar.tsx` — Slim header bar showing focus article info on Associations page
- `PriceChart.tsx` — Finnhub-powered line chart with event bubble overlays
- `NavHeader.tsx` — Shared nav with semantic search bar (SearchPanel slides in as overlay)
- `SearchPanel.tsx` — Slide-in overlay for semantic search results (accessible from all pages)
- `NewsCard.tsx` / `TimelineCard.tsx` — Article display cards with sentiment badges and entity hashtags
- `SentimentBadge.tsx` — Reusable Bullish/Bearish/Neutral badge component
- `TopicChips.tsx` — Single-select chip filter buttons for the Dashboard left sidebar
- `TrendingPanel.tsx` — Right sidebar showing top entities ranked by heat score

## Domain Concepts

- **Entity Types**: Topics, Markets, People, Companies, Policies — extracted per article by OpenAI
- **Sentiment**: Always one of `Bullish | Bearish | Neutral`
- **Magnitude**: 0–10 numeric impact score (LLM-assigned), displayed as number only (no text labels)
- **HeatScore**: `(mentions_this_week - mentions_last_week) / mentions_last_week * 100` — drives trending rankings
- **LinkScore**: Weighted formula combining semantic similarity, entity overlap, magnitude proximity, and sentiment match — drives the association graph
- **Primary Topic**: Most-mentioned entity tag per article; stored as `primary_topic_key` (for DB filtering) and `primary_topic_display` (LLM-generated human-readable label for Timeline headers)

## Reference

`description.md` in the repo root is the canonical product spec — consult it for intended UX behaviour, resolved design decisions, and the full linkScore/HeatScore definitions.

## Conventions

- Path alias: `@/*` maps to `./src/*`
- Dark theme only (`<html class="dark">`), custom color tokens defined in `globals.css` via Tailwind v4 `@theme inline`
- All pages are client components (`"use client"`) that fetch data from API routes
- Supabase tables: `articles` (with `url_hash` unique constraint for dedup, `embedding` column for pgvector), `entity_mentions`, `heat_scores`
- Google Fonts loaded in layout: Inter (text) + Material Symbols Outlined (icons)

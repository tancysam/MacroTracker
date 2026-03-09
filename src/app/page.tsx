"use client";

import { useState, useEffect, useCallback } from "react";
import NavHeader from "@/components/NavHeader";
import TopicChips from "@/components/TopicChips";
import NewsCard from "@/components/NewsCard";
import TrendingPanel from "@/components/TrendingPanel";
import type { Article, SortMode } from "@/lib/types";

export default function DashboardPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([
    "Technology",
    "Energy",
    "Crypto Regulation",
    "Russia-Ukraine",
    "Middle East Conflict",
    "Gold",
    "Brent Crude",
    "WTI Crude",
    "US-China Relations",
  ]);
  const [sortMode, setSortMode] = useState<SortMode>("composite");
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<{
    success: boolean;
    total?: number;
    inserted?: number;
    skipped?: number;
    filtered?: number;
    errors?: number;
    error?: string;
  } | null>(null);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortMode, limit: "30" });
      if (selectedTopics.length > 0) {
        params.set("topics", selectedTopics.join(","));
      }
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopics, sortMode]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const runIngest = async () => {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch("/api/ingest", { method: "POST" });
      const data = await res.json();
      setIngestResult(data);
      if (data.success) fetchArticles();
    } catch {
      setIngestResult({ success: false, error: "Network error" });
    } finally {
      setIngesting(false);
    }
  };

  const sortModes: { key: SortMode; label: string }[] = [
    { key: "heatscore", label: "HeatScore" },
    { key: "recency", label: "Recency" },
    { key: "composite", label: "Composite" },
  ];

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <NavHeader />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-[#1e2530] bg-[#080b12] flex flex-col p-4 gap-6 shrink-0">
          <TopicChips selected={selectedTopics} onSelect={setSelectedTopics} />
        </aside>

        {/* Main Feed */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#080b12]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Trending Global News
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-900/50 border border-slate-800 p-1 rounded-lg">
                  {sortModes.map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setSortMode(mode.key)}
                      className={
                        sortMode === mode.key
                          ? "px-3 py-1 text-[10px] font-bold bg-[#00d4ff]/20 text-[#00d4ff] rounded"
                          : "px-3 py-1 text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
                      }
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={runIngest}
                  disabled={ingesting}
                  className="px-3 py-1.5 text-[10px] font-bold rounded-lg border border-slate-700 bg-slate-900/50 text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ingesting ? "Ingesting..." : "Run Ingest"}
                </button>
              </div>
            </div>

            {ingestResult && (
              <div
                className={`relative rounded-xl border p-4 text-sm ${ingestResult.success
                  ? "border-green-700/50 bg-green-950/30"
                  : "border-red-700/50 bg-red-950/30"
                  }`}
              >
                <button
                  onClick={() => setIngestResult(null)}
                  className="absolute top-3 right-3 text-slate-500 hover:text-white text-base leading-none"
                >
                  ✕
                </button>
                {ingestResult.success ? (
                  <div className="flex items-center gap-3 flex-wrap">
                    {[
                      { label: "Total", value: ingestResult.total },
                      { label: "Inserted", value: ingestResult.inserted },
                      { label: "Skipped", value: ingestResult.skipped },
                      { label: "Filtered", value: ingestResult.filtered },
                      { label: "Errors", value: ingestResult.errors },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700"
                      >
                        <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wide">
                          {label}
                        </span>
                        <span className="text-white font-bold">{value ?? 0}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-red-400 font-medium">
                    {ingestResult.error ?? "Ingest failed"}
                  </p>
                )}
              </div>
            )}

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800/50 rounded-xl h-36 animate-pulse"
                  />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-slate-500 text-sm">
                  No articles found. Run the ingestion pipeline to populate data.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {articles.map((article) => (
                  <NewsCard key={article.id} article={article} />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Panel - Trending */}
        <TrendingPanel />
      </div>
    </div>
  );
}

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
  const [selectedTopic, setSelectedTopic] = useState("All News");
  const [sortMode, setSortMode] = useState<SortMode>("composite");

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ sort: sortMode, limit: "30" });
      if (selectedTopic !== "All News") {
        params.set("topic", selectedTopic);
      }
      const res = await fetch(`/api/articles?${params}`);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTopic, sortMode]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

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
          <TopicChips selected={selectedTopic} onSelect={setSelectedTopic} />
        </aside>

        {/* Main Feed */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#080b12]">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Trending Global News
              </h2>
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
            </div>

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

"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import NavHeader from "@/components/NavHeader";
import PriceChart from "@/components/PriceChart";
import TimelineCard from "@/components/TimelineCard";
import TopicPicker from "@/components/TopicPicker";
import type { Article, Sentiment } from "@/lib/types";

function TimelineContent() {
  const searchParams = useSearchParams();
  const topic = searchParams.get("topic") || "";

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "All">("All");
  const [topicDisplay, setTopicDisplay] = useState(topic);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    if (!topic) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ primary_topic_key: topic });
      if (sentimentFilter !== "All") {
        params.set("sentiment", sentimentFilter);
      }
      const res = await fetch(`/api/articles/timeline?${params}`);
      const data = await res.json();
      const fetched = data.articles || [];
      setArticles(fetched);

      if (fetched.length > 0 && fetched[0].primary_topic_display) {
        setTopicDisplay(fetched[0].primary_topic_display);
      }
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [topic, sentimentFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const sentimentOptions: (Sentiment | "All")[] = ["All", "Bullish", "Bearish", "Neutral"];

  const router = useRouter();

  if (!topic) {
    return (
      <TopicPicker
        title="Explore Topic Timelines"
        subtitle="Choose a topic to see its news timeline and price chart."
        onSelect={(t) => router.push(`/timeline?topic=${encodeURIComponent(t)}`)}
      />
    );
  }

  return (
    <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full px-6 py-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black text-white tracking-tight">{topicDisplay}</h1>
          <span className="px-2 py-0.5 bg-[#00d4ff]/20 text-[#00d4ff] text-[10px] font-bold rounded border border-[#00d4ff]/30">
            {topic}
          </span>
        </div>
      </div>

      {/* Chart — wired up to card highlighting */}
      <div className="mb-12">
        <PriceChart
          topic={topic}
          articles={articles.map((a) => ({
            id: a.id,
            published_at: a.published_at,
            headline: a.headline,
            sentiment: a.sentiment,
          }))}
          onBubbleClick={(id) => setHighlightedId(id)}
          onBubbleHover={(id) => setHighlightedId(id)}
          hoveredArticleId={highlightedId}
        />
      </div>

      {/* Timeline Feed */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              NEWS TIMELINE
            </h2>
            <span className="bg-slate-800 text-[#ff4d6d] text-[10px] font-bold px-2 py-0.5 rounded-full border border-[#ff4d6d]/30">
              {articles.length} events
            </span>
          </div>
          <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
            {sentimentOptions.map((s) => (
              <button
                key={s}
                onClick={() => setSentimentFilter(s)}
                className={
                  sentimentFilter === s
                    ? "px-3 py-1 text-[10px] font-bold bg-slate-800 text-white rounded"
                    : "px-3 py-1 text-[10px] font-bold text-slate-500"
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-8 pl-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800/50 rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-12">
            No articles found for this topic.
          </p>
        ) : (
          <div className="relative flex flex-col gap-12 pl-12">
            {/* Axis Line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-[2px] bg-slate-800" />
            {articles.map((article) => (
              <TimelineCard
                key={article.id}
                article={article}
                isHighlighted={highlightedId === article.id}
                onHover={(id) => setHighlightedId(id)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function TimelinePage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <NavHeader />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-500">Loading timeline...</div>
          </div>
        }
      >
        <TimelineContent />
      </Suspense>
    </div>
  );
}

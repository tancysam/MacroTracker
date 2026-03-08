"use client";

import { useEffect, useState } from "react";
import type { Article } from "@/lib/types";
import NewsCard from "./NewsCard";

interface SearchPanelProps {
  query: string;
  onClose: () => void;
}

export default function SearchPanel({ query, onClose }: SearchPanelProps) {
  const [results, setResults] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query.trim()) return;
    setLoading(true);
    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    })
      .then((res) => res.json())
      .then((data) => setResults(data.articles || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mt-16 w-full max-w-3xl bg-[#0b0e14] border border-[#1e2530] rounded-xl shadow-2xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-top">
        <div className="sticky top-0 bg-[#0b0e14] border-b border-[#1e2530] p-4 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">
            Search results for &quot;{query}&quot;
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕ Close
          </button>
        </div>
        <div className="p-4 space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800/50 rounded-xl h-32 animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No results found.</p>
          ) : (
            results.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

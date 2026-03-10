"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { HeatScoreEntry } from "@/lib/types";

export default function TrendingPanel() {
  const [entries, setEntries] = useState<HeatScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/heat-scores")
      .then((res) => res.json())
      .then((data) => setEntries(data.scores || []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  const maxScore = entries.length > 0 ? Math.max(...entries.map((e) => e.heat_score)) : 1;

  return (
    <aside className="w-80 border-l border-[#1e2530] bg-[#080b12] flex flex-col shrink-0 p-5 overflow-y-auto">
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[#00d4ff] text-lg">trending_up</span>
          Trending &amp; Top Entities
        </h3>
        <p className="text-[10px] text-slate-500 mb-4">
          Ranked by HeatScore — mention growth weighted by volume
        </p>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-800/50 rounded animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-slate-500 text-xs">No trending data yet.</p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <Link
                key={entry.entity_name}
                href={`/timeline?topic=${encodeURIComponent(entry.entity_name)}`}
                className="flex flex-col gap-1 border-b border-slate-800 pb-3 hover:bg-slate-800/30 rounded px-1 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-600 w-4 text-right">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold text-white">{entry.entity_name}</span>
                  </div>
                  <span className="text-xs font-bold text-[#00d4ff]">
                    HS: {Math.round(entry.heat_score)}
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1 ml-6">
                  <div
                    className="bg-[#00d4ff] h-full rounded-full transition-all"
                    style={{ width: `${Math.min((entry.heat_score / maxScore) * 100, 100)}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}

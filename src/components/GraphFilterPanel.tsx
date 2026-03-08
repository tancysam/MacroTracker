"use client";

import type { EntityType, Sentiment, TimeWindow } from "@/lib/types";
import { ENTITY_TYPE_COLORS } from "@/lib/constants";

interface GraphFilterPanelProps {
  entityFilters: Record<EntityType, boolean>;
  onToggleEntity: (type: EntityType) => void;
  timeWindow: TimeWindow;
  onTimeWindowChange: (tw: TimeWindow) => void;
  sentimentFilter: Sentiment | "All";
  onSentimentChange: (s: Sentiment | "All") => void;
  linkThreshold: number;
  onThresholdChange: (val: number) => void;
}

export default function GraphFilterPanel({
  entityFilters,
  onToggleEntity,
  timeWindow,
  onTimeWindowChange,
  sentimentFilter,
  onSentimentChange,
  linkThreshold,
  onThresholdChange,
}: GraphFilterPanelProps) {
  const entityTypes: EntityType[] = ["companies", "people", "policies", "markets"];
  const timeWindows: TimeWindow[] = ["7D", "1M", "3M", "6M"];
  const sentiments: (Sentiment | "All")[] = ["All", "Bearish", "Bullish", "Neutral"];

  return (
    <aside className="w-64 bg-[#0b0e14] border-r border-[#30363d] flex flex-col p-6 overflow-y-auto shrink-0">
      {/* Entity Filters */}
      <section className="mb-8">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-4">
          Entity Filters
        </h3>
        <div className="space-y-1">
          {entityTypes.map((type) => (
            <div
              key={type}
              className="flex items-center gap-3 p-1.5 rounded cursor-pointer group hover:bg-[#161b22]"
              onClick={() => onToggleEntity(type)}
            >
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: ENTITY_TYPE_COLORS[type],
                  boxShadow: `0 0 4px ${ENTITY_TYPE_COLORS[type]}`,
                }}
              />
              <span className="font-mono text-[11px] text-slate-300 group-hover:text-white capitalize">
                {type}
              </span>
              <div className="ml-auto w-4 h-4 rounded border flex items-center justify-center"
                style={{
                  borderColor: entityFilters[type] ? "rgba(245,158,11,0.4)" : "#30363d",
                  background: entityFilters[type] ? "rgba(245,158,11,0.1)" : "transparent",
                }}
              >
                {entityFilters[type] && (
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-sm" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Time Window */}
      <section className="mb-8">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-3">
          Time Window
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {timeWindows.map((tw) => (
            <button
              key={tw}
              onClick={() => onTimeWindowChange(tw)}
              className={`font-mono text-[10px] py-1.5 rounded border transition-all ${
                timeWindow === tw
                  ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                  : "text-slate-400 border-[#30363d] bg-[#161b22] hover:border-[#484f58] hover:text-white"
              }`}
            >
              {tw}
            </button>
          ))}
        </div>
      </section>

      {/* Sentiment Filter */}
      <section className="mb-8">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-3">
          Sentiment Filter
        </h3>
        <div className="space-y-2">
          {sentiments.map((s) => (
            <button
              key={s}
              onClick={() => onSentimentChange(s)}
              className={`w-full font-mono text-left px-3 py-2 text-[11px] rounded border transition-all flex items-center justify-between ${
                sentimentFilter === s
                  ? "text-amber-500 border-amber-500/30 bg-amber-500/5"
                  : "text-slate-400 border-[#30363d] bg-[#161b22] hover:border-[#484f58] hover:text-white"
              }`}
            >
              <span>{s === "All" ? "All Articles" : s}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Link Threshold */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase">
            Link Threshold
          </h3>
          <span className="font-mono text-[11px] text-amber-500 font-bold">
            {linkThreshold.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min="0.4"
          max="0.95"
          step="0.05"
          value={linkThreshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between font-mono text-[9px] text-slate-600 mt-2">
          <span>BROAD</span>
          <span>STRICT</span>
        </div>
      </section>

      {/* LinkScore Formula */}
      <section className="mb-8">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-3">
          LinkScore Formula
        </h3>
        <div className="space-y-2">
          {[
            { label: "Semantic", pct: "40%", color: "#60a5fa" },
            { label: "Entity Overlap", pct: "30%", color: "#a78bfa" },
            { label: "Magnitude Proximity", pct: "20%", color: "#34d399" },
            { label: "Sentiment Alignment", pct: "10%", color: "#fb923c" },
          ].map(({ label, pct, color }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-mono text-[9px] text-slate-400">{label}</span>
                  <span className="font-mono text-[9px] text-slate-500">{pct}</span>
                </div>
                <div className="h-1 bg-[#161b22] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: pct, backgroundColor: color, opacity: 0.5 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Legend */}
      <section className="mt-auto pt-6 border-t border-[#1e2530]">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-4">
          Edge Sentiment
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-[2px] w-8 bg-emerald-500/50 rounded" />
            <span className="font-mono text-[10px] text-slate-500">Aligned</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[2px] w-8 bg-rose-500/50 rounded" />
            <span className="font-mono text-[10px] text-slate-500">Opposing</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-[2px] w-8 bg-slate-500/50 rounded" />
            <span className="font-mono text-[10px] text-slate-500">Neutral</span>
          </div>
        </div>
      </section>
    </aside>
  );
}

"use client";

import type { AssociationNode } from "@/lib/types";
import { ENTITY_TYPE_COLORS } from "@/lib/constants";

interface GraphDetailPanelProps {
  node: AssociationNode | null;
  onExpand: (nodeId: string) => void;
  onClose: () => void;
}

export default function GraphDetailPanel({ node, onExpand, onClose }: GraphDetailPanelProps) {
  if (!node) {
    return (
      <aside className="w-80 bg-[#0b0e14] border-l border-[#30363d] flex flex-col p-6 overflow-y-auto shrink-0">
        <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-4">
          <div className="w-16 h-16 rounded-full border border-slate-600 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border border-slate-400" />
          </div>
          <p className="font-mono text-xs uppercase tracking-widest leading-relaxed">
            Select a node to inspect<br />linkage breakdown
          </p>
        </div>
      </aside>
    );
  }

  const color = ENTITY_TYPE_COLORS[node.type] || ENTITY_TYPE_COLORS.focus;

  function getSentimentColor(val: number) {
    if (val < -0.4) return "#f43f5e";
    if (val > 0.3) return "#10b981";
    return "#94a3b8";
  }

  const sentimentNum =
    node.sentiment === undefined
      ? 0
      : typeof node.sentiment === "number"
        ? node.sentiment
        : 0;

  return (
    <aside className="w-80 bg-[#0b0e14] border-l border-[#30363d] flex flex-col p-6 overflow-y-auto shrink-0">
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
        <span className="font-mono text-[10px] tracking-widest uppercase text-slate-500">
          {node.type}
        </span>
        <span className="ml-auto font-mono text-amber-500 font-bold">
          {node.type === "focus" ? "FOCUS" : node.linkScore.toFixed(2)}
        </span>
      </div>

      <h2
        className="text-base font-medium leading-snug border-l-2 pl-4 mb-3 text-white"
        style={{ borderColor: color }}
      >
        {node.headline}
      </h2>

      <div className="font-mono text-[10px] text-slate-500 mb-6">
        {node.source} · {node.date}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-[#080b0f] border border-[#1e2530] rounded p-3 text-center">
          <div className="text-xl font-bold text-amber-500 mb-1">{node.magnitude}</div>
          <div className="font-mono text-[8px] text-slate-600 tracking-tighter uppercase">Magnitude</div>
        </div>
        <div className="bg-[#080b0f] border border-[#1e2530] rounded p-3 text-center">
          <div
            className="text-xl font-bold mb-1"
            style={{ color: getSentimentColor(sentimentNum) }}
          >
            {sentimentNum > 0 ? "+" : ""}
            {sentimentNum.toFixed(1)}
          </div>
          <div className="font-mono text-[8px] text-slate-600 tracking-tighter uppercase">Sentiment</div>
        </div>
      </div>

      {/* Link Score Breakdown */}
      <div className="mb-8">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-4">
          Link Score Breakdown
        </h3>
        <div className="space-y-4">
          {[
            { label: "Semantic Relevance", value: node.breakdown.semantic, color: "#60a5fa" },
            { label: "Entity Overlap", value: node.breakdown.entity, color: "#a78bfa" },
            { label: "Magnitude Proximity", value: node.breakdown.magnitude, color: "#f59e0b" },
            { label: "Sentiment Alignment", value: node.breakdown.sentiment, color: "#34d399" },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between font-mono text-[10px] mb-2">
                <span className="text-slate-400">{item.label}</span>
                <span style={{ color: item.color }}>{item.value.toFixed(2)}</span>
              </div>
              <div className="h-1 bg-[#1e2530] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${item.value * 100}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Entities */}
      <div className="mb-6">
        <h3 className="font-mono text-[10px] text-slate-500 tracking-[0.15em] uppercase mb-4">
          Key Entities
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(node.entities).map(([type, list]) =>
            list.map((item: string) => (
              <span
                key={`${type}-${item}`}
                className="bg-[#080b0f] px-2 py-1 font-mono text-[10px] rounded border"
                style={{
                  color: ENTITY_TYPE_COLORS[type] || "#94a3b8",
                  borderColor: (ENTITY_TYPE_COLORS[type] || "#94a3b8") + "33",
                }}
              >
                {item}
              </span>
            ))
          )}
        </div>
      </div>

      {node.type !== "focus" && (
        <button
          onClick={() => onExpand(node.id)}
          className="w-full border border-amber-500/40 bg-amber-500/10 text-amber-400 font-mono text-[11px] py-3 rounded hover:bg-amber-500/20 hover:text-amber-300 transition-all font-bold tracking-wide"
        >
          ⊕ EXPAND ON THIS
        </button>
      )}

      <button
        onClick={onClose}
        className="w-full mt-3 border border-slate-800 text-slate-500 font-mono text-[11px] py-3 rounded hover:bg-[#1e2530] hover:text-white transition-all"
      >
        ← BACK TO GRAPH
      </button>
    </aside>
  );
}

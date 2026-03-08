"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import NavHeader from "@/components/NavHeader";
import FocusArticleBar from "@/components/FocusArticleBar";
import AssociationGraph from "@/components/AssociationGraph";
import SentimentBadge from "@/components/SentimentBadge";
import type {
  AssociationMode,
  AssociationNode,
  AssociationsResponseV2,
  AssociationsView,
  EntityType,
  Sentiment,
  TimeWindow,
} from "@/lib/types";

const MODE_OPTIONS: AssociationMode[] = ["broad", "balanced", "strict", "investigative"];
const TIME_WINDOWS: TimeWindow[] = ["7D", "1M", "3M", "6M"];
const SENTIMENT_OPTIONS: (Sentiment | "All")[] = ["All", "Bullish", "Bearish", "Neutral"];
const ENTITY_TYPES: EntityType[] = ["companies", "people", "policies", "markets"];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function titleCase(mode: AssociationMode): string {
  return mode[0].toUpperCase() + mode.slice(1);
}

function AssociationsContent() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("article") || "";

  const [timeWindow, setTimeWindow] = useState<TimeWindow>("1M");
  const [mode, setMode] = useState<AssociationMode>("balanced");
  const [view, setView] = useState<AssociationsView>("evidence");
  const [depth, setDepth] = useState(2);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [sentiment, setSentiment] = useState<Sentiment | "All">("All");
  const [threshold, setThreshold] = useState<number | null>(null);
  const [entityFilters, setEntityFilters] = useState<Record<EntityType, boolean>>({
    companies: true,
    people: true,
    policies: true,
    markets: true,
  });

  const [data, setData] = useState<AssociationsResponseV2 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTraceRoot, setActiveTraceRoot] = useState<string | null>(null);
  const [selectedGraphNode, setSelectedGraphNode] = useState<AssociationNode | null>(null);

  const fetchAssociations = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        time_window: timeWindow,
        mode,
        view,
        depth: String(depth),
      });
      if (sentiment !== "All") params.set("sentiment", sentiment);
      if (threshold !== null) params.set("link_threshold", threshold.toString());
      Object.entries(entityFilters)
        .filter(([, isOn]) => isOn)
        .forEach(([key]) => params.append("entity_types", key));

      const response = await fetch(`/api/articles/${articleId}/associations?${params.toString()}`);
      const json = (await response.json()) as AssociationsResponseV2;
      if (!response.ok) {
        setError((json as { error?: string }).error || "Failed to load associations");
        setData(null);
        return;
      }

      setData(json);
      setSelectedGraphNode(null);
      setActiveTraceRoot((prev) => prev || json.related_events[0]?.article_id || null);
    } catch {
      setError("Failed to load associations");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [articleId, timeWindow, mode, view, depth, sentiment, threshold, entityFilters]);

  useEffect(() => {
    fetchAssociations();
  }, [fetchAssociations]);

  const activeTrace = useMemo(
    () => data?.trace_paths.find((path) => path.root_event_id === activeTraceRoot) || null,
    [data, activeTraceRoot]
  );

  if (!articleId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">
          Select &quot;Associations →&quot; on a news card to investigate linked events.
        </p>
      </div>
    );
  }

  return (
    <>
      {data?.focus && <FocusArticleBar article={data.focus} />}
      <main className="flex-1 overflow-y-auto bg-[#080b12] p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <section className="bg-[#0b0e14] border border-[#30363d] rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {TIME_WINDOWS.map((tw) => (
                  <button
                    key={tw}
                    onClick={() => setTimeWindow(tw)}
                    className={
                      timeWindow === tw
                        ? "px-3 py-1.5 text-[11px] font-semibold rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                        : "px-3 py-1.5 text-[11px] font-semibold rounded border border-[#30363d] text-slate-400 hover:text-white"
                    }
                  >
                    {tw}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setMode(option)}
                    className={
                      mode === option
                        ? "px-3 py-1.5 text-[11px] font-semibold rounded border border-amber-500/40 bg-amber-500/10 text-amber-300"
                        : "px-3 py-1.5 text-[11px] font-semibold rounded border border-[#30363d] text-slate-400 hover:text-white"
                    }
                  >
                    {titleCase(option)}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setView("evidence")}
                  className={
                    view === "evidence"
                      ? "px-3 py-1.5 text-[11px] font-semibold rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "px-3 py-1.5 text-[11px] font-semibold rounded border border-[#30363d] text-slate-400 hover:text-white"
                  }
                >
                  Evidence
                </button>
                <button
                  onClick={() => setView("graph")}
                  className={
                    view === "graph"
                      ? "px-3 py-1.5 text-[11px] font-semibold rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "px-3 py-1.5 text-[11px] font-semibold rounded border border-[#30363d] text-slate-400 hover:text-white"
                  }
                >
                  Graph
                </button>
                <button
                  onClick={() => setShowAdvanced((prev) => !prev)}
                  className="px-3 py-1.5 text-[11px] font-semibold rounded border border-[#30363d] text-slate-300 hover:text-white"
                >
                  {showAdvanced ? "Hide Advanced" : "Advanced"}
                </button>
              </div>
            </div>

            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-[#1f2731] grid md:grid-cols-3 gap-5">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Sentiment</div>
                  <div className="flex gap-2 flex-wrap">
                    {SENTIMENT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        onClick={() => setSentiment(option)}
                        className={
                          sentiment === option
                            ? "px-2 py-1 text-[11px] rounded border border-cyan-500/40 bg-cyan-500/10 text-cyan-300"
                            : "px-2 py-1 text-[11px] rounded border border-[#30363d] text-slate-400"
                        }
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Entity Types</div>
                  <div className="flex gap-2 flex-wrap">
                    {ENTITY_TYPES.map((entityType) => (
                      <button
                        key={entityType}
                        onClick={() =>
                          setEntityFilters((prev) => ({
                            ...prev,
                            [entityType]: !prev[entityType],
                          }))
                        }
                        className={
                          entityFilters[entityType]
                            ? "px-2 py-1 text-[11px] rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 capitalize"
                            : "px-2 py-1 text-[11px] rounded border border-[#30363d] text-slate-500 capitalize"
                        }
                      >
                        {entityType}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-2">
                    <span>Manual Threshold</span>
                    <span>{threshold === null ? "Preset" : threshold.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.3"
                    max="0.95"
                    step="0.05"
                    value={threshold ?? 0.55}
                    onChange={(e) => setThreshold(Number.parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setThreshold(null)}
                      className="px-2 py-1 text-[10px] rounded border border-[#30363d] text-slate-400"
                    >
                      Use Mode Default
                    </button>
                    <button
                      onClick={() => setDepth((prev) => (prev % 3) + 1)}
                      className="px-2 py-1 text-[10px] rounded border border-[#30363d] text-slate-300"
                    >
                      Trace Depth: {depth}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>

          {loading ? (
            <section className="h-72 rounded-xl border border-[#30363d] bg-[#0b0e14] flex items-center justify-center text-slate-500 text-sm">
              Loading investigation view...
            </section>
          ) : error ? (
            <section className="h-72 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-center justify-center text-rose-300 text-sm">
              {error}
            </section>
          ) : !data ? null : (
            <section className="grid lg:grid-cols-[1.2fr_1fr] gap-5">
              <div className="bg-[#0b0e14] border border-[#30363d] rounded-xl p-4 min-h-[560px]">
                {view === "graph" ? (
                  <div className="relative h-[560px] rounded-lg overflow-hidden border border-[#1f2731]">
                    <AssociationGraph
                      nodes={data.nodes || []}
                      edges={data.edges || []}
                      onNodeClick={setSelectedGraphNode}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white tracking-wide">Step 2: Top Linked Events</h2>
                      <span className="text-[11px] text-slate-500">
                        {data.related_events.length} results • {data.scoring_version}
                      </span>
                    </div>
                    {data.related_events.length === 0 ? (
                      <div className="h-56 border border-[#1f2731] rounded-lg flex items-center justify-center text-slate-500 text-sm">
                        No linked events for these parameters.
                      </div>
                    ) : (
                      data.related_events.map((event, index) => (
                        <div
                          key={event.article_id}
                          className="border border-[#1f2731] rounded-lg p-3 bg-[#0e1219] hover:border-[#38506a]"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-[10px] text-slate-500 mb-1">
                                #{index + 1} • {event.source || "Unknown source"} • {formatDate(event.published_at)}
                              </div>
                              <h3 className="text-sm font-semibold text-white leading-snug">{event.headline}</h3>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-semibold text-amber-300">{event.link_score.toFixed(2)}</div>
                              <SentimentBadge sentiment={event.sentiment} />
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {event.explanation.map((line) => (
                              <span
                                key={line}
                                className="px-2 py-1 rounded text-[10px] border border-[#2a3441] text-slate-300"
                              >
                                {line}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => setActiveTraceRoot(event.article_id)}
                            className="mt-3 text-[11px] text-cyan-300 hover:text-cyan-200"
                          >
                            View trace contributors
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <aside className="bg-[#0b0e14] border border-[#30363d] rounded-xl p-4 min-h-[560px]">
                {view === "graph" ? (
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide mb-3">Graph Node Details</h2>
                    {selectedGraphNode ? (
                      <div className="space-y-3">
                        <div className="text-[10px] text-slate-500">
                          {selectedGraphNode.source || "Unknown source"} • {selectedGraphNode.date}
                        </div>
                        <h3 className="text-sm font-semibold text-white">{selectedGraphNode.headline}</h3>
                        {selectedGraphNode.summary && (
                          <p className="text-[12px] text-slate-300 leading-relaxed">{selectedGraphNode.summary}</p>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="border border-[#1f2731] rounded p-2 text-slate-300">
                            Link Score: <span className="text-amber-300">{selectedGraphNode.linkScore.toFixed(2)}</span>
                          </div>
                          <div className="border border-[#1f2731] rounded p-2 text-slate-300">
                            Magnitude: <span className="text-amber-300">{selectedGraphNode.magnitude}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 border border-[#1f2731] rounded-lg flex items-center justify-center text-slate-500 text-sm">
                        Select a node to inspect its evidence context.
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide mb-1">Step 3: Trace Path</h2>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Chain of prior events used to explain the selected linked event.
                    </p>
                    {!activeTrace ? (
                      <div className="h-56 border border-[#1f2731] rounded-lg flex items-center justify-center text-slate-500 text-sm">
                        Select a linked event to load a trace path.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-[11px] text-slate-400">
                          Path Score: <span className="text-cyan-300">{activeTrace.total_score.toFixed(2)}</span>
                        </div>
                        {activeTrace.nodes.map((node, idx) => (
                          <div key={`${activeTrace.path_id}_${node.article_id}`} className="relative pl-6">
                            {idx < activeTrace.nodes.length - 1 && (
                              <div className="absolute left-[7px] top-4 bottom-[-18px] w-px bg-[#2a3441]" />
                            )}
                            <div className="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-cyan-500/80" />
                            <div className="border border-[#1f2731] rounded-lg p-3 bg-[#0e1219]">
                              <div className="text-[10px] text-slate-500 mb-1">
                                {formatDate(node.published_at)} • {node.source || "Unknown source"}
                              </div>
                              <div className="text-sm font-medium text-white leading-snug">{node.headline}</div>
                              <div className="mt-1 text-[11px] text-slate-400">{node.why_it_matters}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-5 pt-4 border-t border-[#1f2731] text-[11px] text-slate-500">
                  Applied: {data.applied_params.time_window} • {titleCase(data.applied_params.mode)} • depth{" "}
                  {data.applied_params.depth}
                </div>
              </aside>
            </section>
          )}
        </div>
      </main>
    </>
  );
}

export default function AssociationsPage() {
  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden">
      <NavHeader />
      <Suspense
        fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-slate-500">Loading associations...</div>
          </div>
        }
      >
        <AssociationsContent />
      </Suspense>
    </div>
  );
}

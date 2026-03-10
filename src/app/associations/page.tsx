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
const ENTITY_TYPES: EntityType[] = ["companies", "people", "policies", "markets", "topics"];

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
    topics: true,
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
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-4">
          <div className="text-5xl font-black text-slate-800 tracking-tight select-none">⬡</div>
          <h1 className="text-xl font-bold text-white">No focus article selected</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The Associations view requires a specific article to investigate. It is not a standalone destination —
            you reach it by selecting an article from the Dashboard or Timeline.
          </p>
          <div className="text-xs text-slate-500 border border-[#1f2731] rounded-lg p-4 text-left space-y-1.5 bg-[#0b0e14]">
            <div className="text-slate-300 font-semibold mb-2">How to get here:</div>
            <div className="flex gap-2"><span className="text-cyan-400 font-mono">1.</span><span>Go to the Dashboard</span></div>
            <div className="flex gap-2"><span className="text-cyan-400 font-mono">2.</span><span>Find a relevant article in the news feed</span></div>
            <div className="flex gap-2"><span className="text-cyan-400 font-mono">3.</span><span>Click the <span className="text-amber-300 font-semibold">Associations</span> link on the article card</span></div>
            <div className="flex gap-2"><span className="text-cyan-400 font-mono">4.</span><span>This page loads with that article as the focus</span></div>
          </div>
          <a
            href="/"
            className="inline-block mt-2 px-4 py-2 text-sm font-semibold rounded border border-[#30363d] text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            ← Go to Dashboard
          </a>
        </div>
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
                <span
                  className="text-[10px] text-slate-600 mr-1"
                  title="How far before/after the focus article's publication date to look for related events"
                >
                  TIME WINDOW
                </span>
                {TIME_WINDOWS.map((tw) => (
                  <button
                    key={tw}
                    onClick={() => setTimeWindow(tw)}
                    title={`Look for events published within ${tw === "7D" ? "7 days" : tw === "1M" ? "1 month" : tw === "3M" ? "3 months" : "6 months"} of the focus article's publication date`}
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
                    title={
                      option === "broad"
                        ? "Broad: low threshold (0.40), up to 8 results — casts a wide net for loosely related events"
                        : option === "balanced"
                        ? "Balanced: medium threshold (0.50), up to 7 results — general-purpose mode"
                        : option === "strict"
                        ? "Strict: high threshold (0.65), up to 5 results — only closely matching events"
                        : "Investigative: weights recent events more heavily (temporal: 0.30) — useful for fast-moving stories"
                    }
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
                  title="Evidence view: ranked list of related articles with link scores and trace path chains"
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
                  title="Graph view: interactive force-directed network — click nodes to inspect link score breakdown"
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
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Entity Types</div>
                  <div className="text-[10px] text-slate-600 mb-2 italic">Disabling an entity type removes it from scoring, not just display.</div>
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
                        title={`${entityFilters[entityType] ? "Disable" : "Enable"} ${entityType} — affects entity overlap scoring`}
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
                    <span title="Minimum link score (0–1) required for an event to appear as related. Higher = fewer, more closely-matched results.">
                      Link Threshold
                    </span>
                    <span className="text-amber-300">{threshold === null ? "Mode default" : threshold.toFixed(2)}</span>
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
                  <div className="flex justify-between text-[9px] text-slate-600 mt-1 mb-2">
                    <span>0.30 (Broad)</span>
                    <span>0.95 (Strict)</span>
                  </div>
                  <div className="mt-1 flex gap-2 items-center">
                    <button
                      onClick={() => setThreshold(null)}
                      title="Reset to the threshold defined by the selected mode (Broad / Balanced / Strict / Investigative)"
                      className="px-2 py-1 text-[10px] rounded border border-[#30363d] text-slate-400 hover:text-white"
                    >
                      Use Mode Default
                    </button>
                    <div className="flex items-center gap-1 border border-[#30363d] rounded px-2 py-1">
                      <span className="text-[10px] text-slate-500" title="How many hops away from the focus article to include in trace chains. Depth 1 = direct connections only; depth 2–3 shows multi-hop chains.">
                        TRACE DEPTH
                      </span>
                      <button
                        onClick={() => setDepth((prev) => Math.max(1, prev - 1))}
                        className="text-slate-400 hover:text-white text-[12px] font-bold px-1 leading-none"
                        title="Decrease trace depth"
                      >
                        −
                      </button>
                      <span className="text-[11px] text-amber-300 font-semibold w-4 text-center">{depth}</span>
                      <button
                        onClick={() => setDepth((prev) => Math.min(3, prev + 1))}
                        className="text-slate-400 hover:text-white text-[12px] font-bold px-1 leading-none"
                        title="Increase trace depth"
                      >
                        +
                      </button>
                    </div>
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
                    {(data.nodes || []).length <= 1 ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm text-center px-6">
                        <span>No related nodes to display.</span>
                        <span className="text-[11px] text-slate-600">
                          Try relaxing your filters: lower the Link Threshold, switch to <span className="text-amber-300">Broad</span> mode, or increase the Time Window.
                        </span>
                      </div>
                    ) : (
                      <AssociationGraph
                        nodes={data.nodes || []}
                        edges={data.edges || []}
                        onNodeClick={setSelectedGraphNode}
                      />
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-bold text-white tracking-wide">Top Linked Events</h2>
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
                              <div
                                className="text-xs font-semibold text-amber-300"
                                title="Link Score (0–1): composite similarity score. Formula: 0.30 × semantic + 0.25 × entity overlap + 0.25 × magnitude proximity + 0.20 × sentiment alignment"
                              >
                                {event.link_score.toFixed(2)}
                                <span className="text-[9px] text-slate-600 font-normal ml-0.5">/ 1.0</span>
                              </div>
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
                            className={`mt-3 text-[11px] hover:underline ${activeTraceRoot === event.article_id ? "text-cyan-200 font-semibold" : "text-cyan-400 hover:text-cyan-300"}`}
                            title="Load the chain of prior events that contributed to this article's relevance (requires Trace Depth ≥ 2)"
                          >
                            {activeTraceRoot === event.article_id ? "▶ Trace loaded →" : "View trace contributors →"}
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
                          <div
                            className="border border-[#1f2731] rounded p-2 text-slate-300"
                            title="Link Score (0–1): composite similarity. Formula: 0.30 × semantic + 0.25 × entity overlap + 0.25 × magnitude proximity + 0.20 × sentiment alignment"
                          >
                            Link Score: <span className="text-amber-300">{selectedGraphNode.linkScore.toFixed(2)}</span>
                            <span className="text-[9px] text-slate-600"> / 1.0</span>
                          </div>
                          <div
                            className="border border-[#1f2731] rounded p-2 text-slate-300"
                            title="Magnitude (0–10): LLM-assigned market impact score. Also determines node size in the graph."
                          >
                            Magnitude: <span className="text-amber-300">{selectedGraphNode.magnitude}</span>
                            <span className="text-[9px] text-slate-600"> / 10</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-56 border border-[#1f2731] rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 text-sm px-4 text-center">
                        <span>Click any node in the graph to inspect it.</span>
                        <span className="text-[11px] text-slate-600">You will see headline, link score breakdown, magnitude, and sentiment.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h2 className="text-sm font-bold text-white tracking-wide mb-1">Trace Path</h2>
                    <p className="text-[11px] text-slate-500 mb-4">
                      Chain of prior events used to explain the selected linked event.
                    </p>
                    {!activeTrace ? (
                      <div className="h-56 border border-[#1f2731] rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 text-sm px-4 text-center">
                        <span>Click <span className="text-cyan-400">View trace contributors →</span> on a linked event to load its trace chain here.</span>
                      </div>
                    ) : activeTrace.nodes.length === 0 ? (
                      <div className="h-56 border border-[#1f2731] rounded-lg flex flex-col items-center justify-center gap-2 text-slate-500 text-sm px-4 text-center">
                        <span>No trace contributors found for this event.</span>
                        <span className="text-[11px] text-slate-600">
                          Try increasing <strong className="text-slate-400">Trace Depth</strong> to 2 or 3 in Advanced settings.
                        </span>
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

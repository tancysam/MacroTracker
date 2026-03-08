"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import NavHeader from "@/components/NavHeader";
import FocusArticleBar from "@/components/FocusArticleBar";
import GraphFilterPanel from "@/components/GraphFilterPanel";
import AssociationGraph from "@/components/AssociationGraph";
import GraphDetailPanel from "@/components/GraphDetailPanel";
import type { Article, AssociationNode, AssociationEdge, EntityType, Sentiment, TimeWindow } from "@/lib/types";

function AssociationsContent() {
  const searchParams = useSearchParams();
  const articleId = searchParams.get("article") || "";

  const [focusArticle, setFocusArticle] = useState<Article | null>(null);
  const [nodes, setNodes] = useState<AssociationNode[]>([]);
  const [edges, setEdges] = useState<AssociationEdge[]>([]);
  const [selectedNode, setSelectedNode] = useState<AssociationNode | null>(null);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [entityFilters, setEntityFilters] = useState<Record<EntityType, boolean>>({
    companies: true,
    people: true,
    policies: true,
    markets: true,
  });
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("1M");
  const [sentimentFilter, setSentimentFilter] = useState<Sentiment | "All">("All");
  const [linkThreshold, setLinkThreshold] = useState(0.5);

  // Expansion state: track levels and all accumulated nodes/edges
  const [allNodes, setAllNodes] = useState<AssociationNode[]>([]);
  const [allEdges, setAllEdges] = useState<AssociationEdge[]>([]);
  const [maxLevel, setMaxLevel] = useState(0);
  const [filterResetNotice, setFilterResetNotice] = useState(false);

  // Refs for stable access in filter-change fetch (avoid stale closures)
  const allNodesRef = useRef<AssociationNode[]>([]);
  const allEdgesRef = useRef<AssociationEdge[]>([]);
  const prevArticleIdRef = useRef<string>("");
  const initialNodesRef = useRef<AssociationNode[]>([]);
  const initialEdgesRef = useRef<AssociationEdge[]>([]);

  const fetchAssociations = useCallback(async () => {
    if (!articleId) return;
    setLoading(true);

    const isNewArticle = prevArticleIdRef.current !== articleId;
    if (isNewArticle) {
      prevArticleIdRef.current = articleId;
      setSelectedNode(null);
    }

    // When filters change while expanded, reset to level 1
    const wasExpanded = !isNewArticle && allNodesRef.current.some((n) => (n.level || 0) >= 2);
    if (wasExpanded) {
      setFilterResetNotice(true);
      setTimeout(() => setFilterResetNotice(false), 3000);
    }

    try {
      const params = new URLSearchParams({
        time_window: timeWindow,
        link_threshold: linkThreshold.toString(),
      });
      if (sentimentFilter !== "All") {
        params.set("sentiment", sentimentFilter);
      }
      const activeTypes = Object.entries(entityFilters)
        .filter(([, v]) => v)
        .map(([k]) => k);
      activeTypes.forEach((t) => params.append("entity_types", t));

      const res = await fetch(`/api/articles/${articleId}/associations?${params}`);
      const data = await res.json();

      if (data.focusArticle) {
        setFocusArticle(data.focusArticle);
      }

      const fetchedNodes: AssociationNode[] = data.nodes || [];
      const fetchedEdges: AssociationEdge[] = data.edges || [];

      // Always reset to level 1 on filter change (simple, predictable)
      const finalNodes = fetchedNodes;
      const finalEdges = fetchedEdges;
      setMaxLevel(1);

      // Cache initial state for reset button
      initialNodesRef.current = finalNodes;
      initialEdgesRef.current = finalEdges;

      allNodesRef.current = finalNodes;
      allEdgesRef.current = finalEdges;
      setAllNodes(finalNodes);
      setAllEdges(finalEdges);
      setNodes(finalNodes);
      setEdges(finalEdges);
    } catch {
      // keep empty
    } finally {
      setLoading(false);
    }
  }, [articleId, timeWindow, sentimentFilter, entityFilters, linkThreshold]);

  useEffect(() => {
    fetchAssociations();
  }, [fetchAssociations]);

  function toggleEntity(type: EntityType) {
    setEntityFilters((prev) => ({ ...prev, [type]: !prev[type] }));
  }

  function handleResetGraph() {
    const resetNodes = initialNodesRef.current;
    const resetEdges = initialEdgesRef.current;
    allNodesRef.current = resetNodes;
    allEdgesRef.current = resetEdges;
    setAllNodes(resetNodes);
    setAllEdges(resetEdges);
    setNodes(resetNodes);
    setEdges(resetEdges);
    setMaxLevel(1);
    setSelectedNode(null);
  }

  async function handleExpand(nodeId: string) {
    // Find the node's article ID
    const node = allNodes.find((n) => n.id === nodeId);
    if (!node) return;

    // The articleId for expansion - for expanded nodes we stored it
    const expandArticleId = (node as AssociationNode & { articleId?: string }).articleId;
    if (!expandArticleId) return;

    try {
      const params = new URLSearchParams({
        time_window: timeWindow,
        link_threshold: linkThreshold.toString(),
      });
      if (sentimentFilter !== "All") {
        params.set("sentiment", sentimentFilter);
      }

      const res = await fetch(`/api/articles/${expandArticleId}/associations?${params}`);
      const data = await res.json();

      const newNodes: AssociationNode[] = data.nodes || [];
      const newEdges: AssociationEdge[] = data.edges || [];

      const newLevel = maxLevel + 1;

      // Remap IDs to avoid clashes
      const remappedNodes = newNodes
        .filter((n: AssociationNode) => n.type !== "focus")
        .map((n: AssociationNode, i: number) => ({
          ...n,
          id: `L${newLevel}_n${i + 1}`,
          level: newLevel,
        }));

      const remappedEdges = newEdges.map((e: AssociationEdge) => ({
        ...e,
        source: e.source === "focus" ? nodeId : `L${newLevel}_${e.source}`,
        target: e.target === "focus" ? nodeId : `L${newLevel}_${e.target}`,
        score: e.score,
      }));

      let updatedNodes = [...allNodes, ...remappedNodes];
      let updatedEdges = [...allEdges, ...remappedEdges];

      // Sliding window: if more than 3 levels, remove the oldest level
      if (newLevel > 3) {
        const removeLevel = newLevel - 3;
        const removedIds = new Set(
          updatedNodes.filter((n) => (n.level || 0) === removeLevel).map((n) => n.id)
        );
        // Remap edges from removed nodes → focus, then prune self-loops
        updatedEdges = updatedEdges
          .map((e) => ({
            ...e,
            source: removedIds.has(e.source) ? "focus" : e.source,
            target: removedIds.has(e.target) ? "focus" : e.target,
          }))
          .filter((e) => e.source !== e.target);
        // Remove the level nodes themselves
        updatedNodes = updatedNodes.filter(
          (n) => (n.level || 0) !== removeLevel || n.type === "focus"
        );
        // Prune any remaining dangling edges
        const survivingIds = new Set(updatedNodes.map((n) => n.id));
        updatedEdges = updatedEdges.filter(
          (e) => survivingIds.has(e.source) && survivingIds.has(e.target)
        );
      }

      allNodesRef.current = updatedNodes;
      allEdgesRef.current = updatedEdges;
      setAllNodes(updatedNodes);
      setAllEdges(updatedEdges);
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      setMaxLevel(newLevel);
    } catch {
      // ignore expansion error
    }
  }

  if (!articleId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-slate-500">
          Select &quot;Associations →&quot; on a news card to explore connections.
        </p>
      </div>
    );
  }

  return (
    <>
      {focusArticle && <FocusArticleBar article={focusArticle} />}
      <main className="flex-1 flex overflow-hidden">
        <GraphFilterPanel
          entityFilters={entityFilters}
          onToggleEntity={toggleEntity}
          timeWindow={timeWindow}
          onTimeWindowChange={setTimeWindow}
          sentimentFilter={sentimentFilter}
          onSentimentChange={setSentimentFilter}
          linkThreshold={linkThreshold}
          onThresholdChange={setLinkThreshold}
        />

        {loading ? (
          <div className="flex-1 flex items-center justify-center bg-[#0b0e14]">
            <div className="text-slate-500 text-sm">Loading association graph...</div>
          </div>
        ) : (
          <div className="flex-1 relative">
            {filterResetNotice && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[11px] px-4 py-2 rounded-lg backdrop-blur-sm">
                Filters updated — graph reset to level 1
              </div>
            )}
            <AssociationGraph
              nodes={nodes}
              edges={edges}
              onNodeClick={setSelectedNode}
              onResetGraph={handleResetGraph}
            />
          </div>
        )}

        <GraphDetailPanel
          node={selectedNode}
          onExpand={handleExpand}
          onClose={() => setSelectedNode(null)}
        />
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

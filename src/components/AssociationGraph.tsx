"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { AssociationNode, AssociationEdge } from "@/lib/types";
import { ENTITY_TYPE_COLORS } from "@/lib/constants";

interface AssociationGraphProps {
  nodes: AssociationNode[];
  edges: AssociationEdge[];
  onNodeClick: (node: AssociationNode) => void;
  onResetGraph?: () => void;
}

function getEdgeColor(sourceNode: AssociationNode, targetNode: AssociationNode) {
  const srcSent = typeof sourceNode.sentiment === "number" ? sourceNode.sentiment : 0;
  const tgtSent = typeof targetNode.sentiment === "number" ? targetNode.sentiment : 0;
  const diff = Math.abs(srcSent - tgtSent);
  if (diff < 0.2) return "rgba(16, 185, 129, 0.4)"; // Aligned
  if (diff > 0.5) return "rgba(244, 63, 94, 0.4)";  // Opposing
  return "rgba(148, 163, 184, 0.2)";                // Neutral
}

function getLevelDashArray(level: number): string {
  if (level <= 1) return "none"; // Solid ring for level 0 (focus) and level 1
  if (level === 2) return "6,3"; // Dashed ring for level 2
  return "3,3"; // Dotted ring for level 3+
}

function getSentimentLabel(val: number): string {
  if (val > 0.3) return "Bullish";
  if (val < -0.3) return "Bearish";
  return "Neutral";
}

export default function AssociationGraph({ nodes, edges, onNodeClick, onResetGraph }: AssociationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<AssociationNode, AssociationEdge> | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const maxLevel = Math.max(...nodes.map((n) => n.level || 0), 0);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;
    const cx = width / 2;
    const cy = height / 2;

    // Defs for glow
    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "glow")
      .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    glow.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "blur");
    glow.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    const focusGlow = defs.append("filter").attr("id", "focusglow")
      .attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    focusGlow.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "blur");
    focusGlow.append("feComposite").attr("in", "SourceGraphic").attr("in2", "blur").attr("operator", "over");

    const g = svg.append("g");

    // Zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Build a node map for quick lookup
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Tooltip ref
    const tooltip = tooltipRef.current;

    // Pin focus node to center
    const focusNode = nodes.find((n) => n.type === "focus");
    if (focusNode) {
      focusNode.fx = cx;
      focusNode.fy = cy;
    }

    // Simulation — tuned for stability
    const sim = d3.forceSimulation(nodes)
      .alphaDecay(0.04)
      .velocityDecay(0.4)
      .force(
        "link",
        d3.forceLink(edges)
          .id((d: any) => d.id)
          .distance(180)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(cx, cy))
      .force("collision", d3.forceCollide().radius((d: any) => d.id === "focus" ? 80 : 60));

    simulationRef.current = sim as any;

    // Edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke", (d: any) => {
        const src = nodeMap.get(typeof d.source === "string" ? d.source : d.source.id);
        const tgt = nodeMap.get(typeof d.target === "string" ? d.target : d.target.id);
        if (src && tgt) return getEdgeColor(src, tgt);
        return "rgba(148, 163, 184, 0.2)";
      })
      .attr("stroke-width", (d) => 1 + d.score * 3)
      .style("cursor", "pointer")
      .on("mouseenter", (event: MouseEvent, d: any) => {
        if (!tooltip) return;
        const shared: string[] = d.sharedEntities || [];
        if (shared.length === 0) {
          tooltip.style.display = "none";
          return;
        }
        tooltip.innerHTML = `<span style="color:#94a3b8;font-size:9px;text-transform:uppercase;letter-spacing:0.1em">Shared Entities</span><br/><span style="color:#e2e8f0;font-size:11px">${shared.slice(0, 6).join(", ")}${shared.length > 6 ? ` +${shared.length - 6}` : ""}</span><br/><span style="color:#f59e0b;font-size:10px">Link: ${d.score.toFixed(2)}</span>`;
        tooltip.style.display = "block";
        tooltip.style.left = `${event.offsetX + 12}px`;
        tooltip.style.top = `${event.offsetY - 12}px`;
      })
      .on("mouseleave", () => {
        if (tooltip) tooltip.style.display = "none";
      });

    // Nodes
    const node = g
      .append("g")
      .selectAll<SVGGElement, AssociationNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "cursor-pointer")
      .on("click", (_, d) => onNodeClick(d))
      .on("mouseenter", (event: MouseEvent, d: AssociationNode) => {
        if (!tooltip) return;
        const sentLabel = d.type === "focus" ? "Focus Article" : getSentimentLabel(d.sentiment);
        const truncHeadline = d.headline.length > 80 ? d.headline.slice(0, 80) + "…" : d.headline;
        const levelBadge = d.level > 0 ? `<span style="color:#64748b;font-size:9px"> · L${d.level}</span>` : "";
        tooltip.innerHTML = `<span style="color:#e2e8f0;font-size:11px;font-weight:500">${truncHeadline}</span>${levelBadge}<br/><span style="color:${d.type === "focus" ? "#f59e0b" : ENTITY_TYPE_COLORS[d.type] || "#94a3b8"};font-size:10px">${sentLabel} · Mag ${d.magnitude}</span>`;
        tooltip.style.display = "block";
        tooltip.style.left = `${event.offsetX + 12}px`;
        tooltip.style.top = `${event.offsetY - 12}px`;
      })
      .on("mouseleave", () => {
        if (tooltip) tooltip.style.display = "none";
      })
      .call(
        d3.drag<SVGGElement, AssociationNode>()
          .on("start", (event: any) => {
            if (!event.active) sim.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
          })
          .on("drag", (event: any) => {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
          })
          .on("end", (event: any) => {
            if (!event.active) sim.alphaTarget(0);
            // Keep focus pinned to center
            if (event.subject.type === "focus") {
              event.subject.fx = cx;
              event.subject.fy = cy;
            } else {
              event.subject.fx = null;
              event.subject.fy = null;
            }
          })
      );

    // Outer circle — with level-based dash pattern
    node
      .append("circle")
      .attr("r", (d) => (d.type === "focus" ? 50 : 25 + d.magnitude * 1.5))
      .attr("fill", (d) => `${ENTITY_TYPE_COLORS[d.type] || "#f59e0b"}10`)
      .attr("stroke", (d) => ENTITY_TYPE_COLORS[d.type] || "#f59e0b")
      .attr("stroke-width", (d) => (d.type === "focus" ? 2 : 1.5))
      .attr("stroke-dasharray", (d) => getLevelDashArray(d.level || 0))
      .attr("filter", (d) => (d.type === "focus" ? "url(#focusglow)" : "url(#glow)"));

    // Inner dot
    node
      .append("circle")
      .attr("r", 4)
      .attr("fill", (d) => ENTITY_TYPE_COLORS[d.type] || "#f59e0b");

    // Labels
    node
      .append("text")
      .attr("y", (d) => (d.type === "focus" ? 70 : 50))
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", "11px")
      .attr("font-weight", "500")
      .selectAll("tspan")
      .data((d) => d.label.split("\n"))
      .join("tspan")
      .attr("x", 0)
      .attr("dy", (_, i) => (i === 0 ? 0 : "1.2em"))
      .text((d) => d);

    // Metadata label
    node
      .append("text")
      .attr("y", (d) => (d.type === "focus" ? 100 : 80))
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .attr("font-size", "9px")
      .text((d) => (d.type === "focus" ? "" : `${d.source} · ${d.date}`));

    sim.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Reset view button handler
    const resetBtn = document.getElementById("reset-view");
    if (resetBtn) {
      resetBtn.onclick = () => {
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
      };
    }
  }, [nodes, edges, onNodeClick]);

  useEffect(() => {
    renderGraph();
    return () => {
      simulationRef.current?.stop();
    };
  }, [renderGraph]);

  // Handle resize
  useEffect(() => {
    function handleResize() {
      if (simulationRef.current && containerRef.current) {
        const w = containerRef.current.offsetWidth;
        const h = containerRef.current.offsetHeight;
        simulationRef.current
          .force("center", d3.forceCenter(w / 2, h / 2));
        // Re-pin focus node to new center
        const focusNode = nodes.find((n) => n.type === "focus");
        if (focusNode) {
          focusNode.fx = w / 2;
          focusNode.fy = h / 2;
        }
        simulationRef.current.alpha(0.3).restart();
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        background: "radial-gradient(circle at center, #0d1117 0%, #080b0f 100%)",
      }}
    >
      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(#30363d 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <svg
        ref={svgRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      {/* Tooltip overlay */}
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-[#161b22]/95 backdrop-blur-sm border border-[#30363d] rounded-lg px-3 py-2 font-mono leading-relaxed max-w-xs z-50"
        style={{ display: "none" }}
      />
      {/* Stats bar */}
      <div className="absolute bottom-8 left-8 font-mono text-[10px] text-slate-500 bg-[#0b0e14]/80 backdrop-blur px-3 py-1.5 rounded border border-[#30363d]">
        {nodes.length - 1} CONNECTIONS · {edges.length} EDGES
        {maxLevel > 1 && ` · DEPTH ${maxLevel}`}
      </div>
      {/* Level legend (shown when expanded beyond level 1) */}
      {maxLevel > 1 && (
        <div className="absolute top-4 left-4 font-mono text-[9px] text-slate-500 bg-[#0b0e14]/80 backdrop-blur px-3 py-2 rounded border border-[#30363d] space-y-1.5">
          <div className="flex items-center gap-2">
            <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#64748b" strokeWidth="1.5" /></svg>
            <span>Level 1</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#64748b" strokeWidth="1.5" strokeDasharray="6,3" /></svg>
            <span>Level 2</span>
          </div>
          {maxLevel >= 3 && (
            <div className="flex items-center gap-2">
              <svg width="24" height="6"><line x1="0" y1="3" x2="24" y2="3" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3,3" /></svg>
              <span>Level 3</span>
            </div>
          )}
        </div>
      )}
      {/* Reset graph button (collapse to level 1) — only shown when expanded */}
      {maxLevel > 1 && onResetGraph && (
        <button
          onClick={onResetGraph}
          className="absolute top-4 right-4 bg-[#161b22] border border-[#30363d] text-slate-400 font-mono text-[10px] px-4 py-2 rounded-lg hover:border-amber-500/50 hover:text-white transition-all shadow-lg active:scale-95"
        >
          ↺ RESET GRAPH
        </button>
      )}
      <button
        id="reset-view"
        className="absolute bottom-8 right-8 bg-[#161b22] border border-[#30363d] text-slate-400 font-mono text-[10px] px-4 py-2 rounded-lg hover:border-amber-500/50 hover:text-white transition-all shadow-lg active:scale-95"
      >
        RESET VIEW
      </button>
    </div>
  );
}

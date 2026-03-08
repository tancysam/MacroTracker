"use client";

import { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import type { AssociationNode, AssociationEdge } from "@/lib/types";
import { ENTITY_TYPE_COLORS } from "@/lib/constants";

interface AssociationGraphProps {
  nodes: AssociationNode[];
  edges: AssociationEdge[];
  onNodeClick: (node: AssociationNode) => void;
}

function getEdgeColor(sourceNode: AssociationNode, targetNode: AssociationNode) {
  const srcSent = typeof sourceNode.sentiment === "number" ? sourceNode.sentiment : 0;
  const tgtSent = typeof targetNode.sentiment === "number" ? targetNode.sentiment : 0;
  const diff = Math.abs(srcSent - tgtSent);
  if (diff < 0.2) return "rgba(16, 185, 129, 0.4)"; // Aligned
  if (diff > 0.5) return "rgba(244, 63, 94, 0.4)";  // Opposing
  return "rgba(148, 163, 184, 0.2)";                // Neutral
}

export default function AssociationGraph({ nodes, edges, onNodeClick }: AssociationGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<AssociationNode, AssociationEdge> | null>(null);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

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

    // Simulation
    const sim = d3.forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(edges)
          .id((d: any) => d.id)
          .distance(180)
      )
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
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
      .attr("stroke-width", (d) => 1 + d.score * 3);

    // Nodes
    const node = g
      .append("g")
      .selectAll<SVGGElement, AssociationNode>("g")
      .data(nodes)
      .join("g")
      .attr("class", "cursor-pointer")
      .on("click", (_, d) => onNodeClick(d))
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
            event.subject.fx = null;
            event.subject.fy = null;
          })
      );

    // Outer circle
    node
      .append("circle")
      .attr("r", (d) => (d.type === "focus" ? 50 : 25 + d.magnitude * 1.5))
      .attr("fill", (d) => `${ENTITY_TYPE_COLORS[d.type] || "#f59e0b"}10`)
      .attr("stroke", (d) => ENTITY_TYPE_COLORS[d.type] || "#f59e0b")
      .attr("stroke-width", (d) => (d.type === "focus" ? 2 : 1))
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

    // Reset button handler
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
        simulationRef.current.alpha(0.3).restart();
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden"
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
      <div className="absolute bottom-8 left-8 font-mono text-[10px] text-slate-500 bg-[#0b0e14]/80 backdrop-blur px-3 py-1.5 rounded border border-[#30363d]">
        {nodes.length - 1} CONNECTIONS · {edges.length} EDGES
      </div>
      <button
        id="reset-view"
        className="absolute bottom-8 right-8 bg-[#161b22] border border-[#30363d] text-slate-400 font-mono text-[10px] px-4 py-2 rounded-lg hover:border-amber-500/50 hover:text-white transition-all shadow-lg active:scale-95"
      >
        RESET GRAPH POSITION
      </button>
    </div>
  );
}

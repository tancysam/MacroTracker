"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MARKET_INSTRUMENTS, TIME_WINDOW_DAYS } from "@/lib/constants";
import type { TimeRange } from "@/lib/types";

interface PriceChartProps {
  topic: string;
  articles: { published_at: string; headline: string; sentiment: string }[];
}

export default function PriceChart({ topic, articles }: PriceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMarket, setSelectedMarket] = useState("US 10Y Yield");
  const [timeRange, setTimeRange] = useState<TimeRange>("6M");
  const [candles, setCandles] = useState<{ t: number[]; c: number[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    const instrument = MARKET_INSTRUMENTS[selectedMarket];
    if (!instrument) return;

    const now = Math.floor(Date.now() / 1000);
    const days = TIME_WINDOW_DAYS[timeRange] || 180;
    const from = now - days * 86400;

    try {
      const res = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(instrument.yahooSymbol)}&from=${from}&to=${now}`
      );
      const data = await res.json();
      if (data.s === "ok" || (data.t && data.c)) {
        setCandles({ t: data.t, c: data.c });
      } else {
        setCandles(null);
      }
    } catch {
      setCandles(null);
    } finally {
      setLoading(false);
    }
  }, [selectedMarket, timeRange]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

  const timeRanges: TimeRange[] = ["1M", "3M", "6M", "1Y", "ALL"];

  // Render chart as SVG
  const renderChart = () => {
    if (!candles || candles.t.length === 0) {
      return (
        <div className="flex items-center justify-center h-[300px] text-slate-500 text-sm">
          {loading ? "Loading market data..." : "No market data available"}
        </div>
      );
    }

    const width = 1000;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 20, left: 0 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const prices = candles.c;
    const times = candles.t;
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const range = maxP - minP || 1;

    const points = prices.map((p, i) => {
      const x = padding.left + (i / (prices.length - 1)) * chartW;
      const y = padding.top + chartH - ((p - minP) / range) * chartH;
      return `${x},${y}`;
    });

    const pathD = `M${points.join(" L")}`;

    // Event bubbles for articles
    const eventBubbles = articles
      .map((a) => {
        const at = Math.floor(new Date(a.published_at).getTime() / 1000);
        const idx = times.findIndex((t, i) => i < times.length - 1 && t <= at && times[i + 1] > at);
        if (idx < 0) return null;
        const x = padding.left + (idx / (prices.length - 1)) * chartW;
        const y = padding.top + chartH - ((prices[idx] - minP) / range) * chartH;
        const color =
          a.sentiment === "Bearish" ? "#ff4d6d" : a.sentiment === "Bullish" ? "#00f5d4" : "#fb8500";
        return { x, y, color, headline: a.headline };
      })
      .filter(Boolean);

    // Y-axis labels
    const yLabels = Array.from({ length: 5 }, (_, i) => {
      const val = minP + (range * i) / 4;
      const y = padding.top + chartH - (i / 4) * chartH;
      return { val: val.toFixed(2), y };
    });

    return (
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-[300px]">
        {/* Grid lines */}
        {yLabels.map((label, i) => (
          <line
            key={i}
            x1={padding.left}
            y1={label.y}
            x2={width - padding.right}
            y2={label.y}
            stroke="#1e293b"
            strokeDasharray="4"
            strokeWidth="1"
          />
        ))}
        {/* Price line */}
        <path d={pathD} fill="none" stroke="#00d4ff" strokeWidth="2" className="drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" />
        {/* Event bubbles */}
        {eventBubbles.map((bubble, i) => (
          <g key={i}>
            <line
              x1={bubble!.x}
              y1={bubble!.y}
              x2={bubble!.x}
              y2={height - padding.bottom}
              stroke={bubble!.color}
              strokeDasharray="4"
              strokeWidth="1"
            />
            <circle cx={bubble!.x} cy={bubble!.y} r="6" fill={bubble!.color} />
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="w-full bg-slate-900/20 border border-slate-800/50 rounded-2xl p-8 relative min-h-[400px]">
      {/* Legend */}
      <div className="absolute top-8 left-8 flex gap-8 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#ff4d6d]" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Bearish</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00f5d4]" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Bullish</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#fb8500]" />
          <span className="text-[10px] font-bold text-slate-500 uppercase">Neutral</span>
        </div>
      </div>

      {/* Selected market label */}
      <div className="absolute bottom-8 right-8 flex items-center gap-2 z-10">
        <div className="h-[2px] w-6 bg-[#00d4ff]" />
        <span className="text-[10px] font-bold text-slate-500 uppercase">{selectedMarket}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overlay:</span>
          <select
            value={selectedMarket}
            onChange={(e) => setSelectedMarket(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded px-3 py-1.5 focus:ring-1 focus:ring-[#00d4ff] focus:outline-none"
          >
            {Object.keys(MARKET_INSTRUMENTS).map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
          {timeRanges.map((tr) => (
            <button
              key={tr}
              onClick={() => setTimeRange(tr)}
              className={
                tr === timeRange
                  ? "px-3 py-1 text-xs font-bold bg-[#00d4ff]/20 text-[#00d4ff] rounded"
                  : "px-3 py-1 text-xs font-bold text-slate-500"
              }
            >
              {tr}
            </button>
          ))}
        </div>
      </div>

      {renderChart()}
    </div>
  );
}

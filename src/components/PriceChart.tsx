"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MARKET_INSTRUMENTS, TIME_WINDOW_DAYS } from "@/lib/constants";
import type { TimeRange } from "@/lib/types";

interface PriceChartProps {
  topic: string;
  articles: { id: string; published_at: string; headline: string; sentiment: string }[];
  onBubbleClick?: (articleId: string) => void;
  onBubbleHover?: (articleId: string | null) => void;
  hoveredArticleId?: string | null;
}

export default function PriceChart({
  topic,
  articles,
  onBubbleClick,
  onBubbleHover,
  hoveredArticleId,
}: PriceChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMarket, setSelectedMarket] = useState("US 10Y Yield");
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [candles, setCandles] = useState<{ t: number[]; c: number[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; headline: string } | null>(null);

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    const instrument = MARKET_INSTRUMENTS[selectedMarket];
    if (!instrument) return;

    const now = Math.floor(Date.now() / 1000);
    const days = TIME_WINDOW_DAYS[timeRange] || 180;
    const from = now - days * 86400;

    try {
      const res = await fetch(
        `/api/market-data?symbol=${encodeURIComponent(instrument.finnhubSymbol)}&from=${from}&to=${now}`
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
    const padding = { top: 40, right: 20, bottom: 36, left: 56 };
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

    // Map articles to bubble positions — find nearest candle by timestamp
    // Track how many bubbles land on each candle index so we can offset them
    const slotsByIdx = new Map<number, number>();
    const eventBubbles = articles.map((a) => {
      const at = Math.floor(new Date(a.published_at).getTime() / 1000);
      let idx = 0;
      let minDiff = Math.abs(times[0] - at);
      for (let i = 1; i < times.length; i++) {
        const diff = Math.abs(times[i] - at);
        if (diff < minDiff) { minDiff = diff; idx = i; }
      }
      const baseX = padding.left + (idx / (prices.length - 1)) * chartW;
      const baseY = padding.top + chartH - ((prices[idx] - minP) / range) * chartH;
      const color =
        a.sentiment === "Bearish" ? "#ff4d6d" : a.sentiment === "Bullish" ? "#00f5d4" : "#fb8500";
      const prevPrice = idx > 0 ? prices[idx - 1] : prices[idx];
      const bpsChange = Math.round((prices[idx] - prevPrice) * 100);
      const bpsLabel = bpsChange >= 0 ? `+${bpsChange}bps` : `${bpsChange}bps`;
      // Spread bubbles on the same candle: alternate left/right and stack upward
      const slot = slotsByIdx.get(idx) || 0;
      slotsByIdx.set(idx, slot + 1);
      const xOffset = slot === 0 ? 0 : slot % 2 === 1 ? (Math.ceil(slot / 2) * 22) : -(Math.ceil(slot / 2) * 22);
      const yOffset = slot * 24;
      return { x: baseX + xOffset, y: baseY - yOffset, color, headline: a.headline, id: a.id, bpsLabel };
    });

    const yLabels = Array.from({ length: 5 }, (_, i) => {
      const val = minP + (range * i) / 4;
      const y = padding.top + chartH - (i / 4) * chartH;
      return { val: val.toFixed(2), y };
    });

    const xTickCount = 5;
    const xLabels = Array.from({ length: xTickCount }, (_, i) => {
      const idx = Math.round((i / (xTickCount - 1)) * (times.length - 1));
      const x = padding.left + (idx / (prices.length - 1)) * chartW;
      const date = new Date(times[idx] * 1000);
      const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return { x, label };
    });

    return (
      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-[300px]"
        >
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

          {/* Axis lines */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke="#334155" strokeWidth="1" />
          <line x1={padding.left} y1={padding.top + chartH} x2={width - padding.right} y2={padding.top + chartH} stroke="#334155" strokeWidth="1" />

          {/* Y-axis labels */}
          {yLabels.map((label, i) => (
            <text
              key={i}
              x={padding.left - 8}
              y={label.y + 4}
              textAnchor="end"
              fill="#475569"
              fontSize="10"
            >
              {label.val}
            </text>
          ))}

          {/* X-axis labels */}
          {xLabels.map((tick, i) => (
            <g key={i}>
              <line
                x1={tick.x} y1={padding.top + chartH}
                x2={tick.x} y2={padding.top + chartH + 4}
                stroke="#334155" strokeWidth="1"
              />
              <text
                x={tick.x}
                y={padding.top + chartH + 16}
                textAnchor="middle"
                fill="#475569"
                fontSize="10"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {/* Price line */}
          <path
            d={pathD}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            className="drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]"
          />

          {/* Event bubbles */}
          {eventBubbles.map((bubble, i) => {
            const isHovered = hoveredArticleId === bubble.id;
            return (
              <g
                key={i}
                style={{ cursor: "pointer" }}
                onClick={() => onBubbleClick?.(bubble.id)}
                onMouseEnter={() => {
                  onBubbleHover?.(bubble.id);
                  setTooltip({ x: bubble.x, y: bubble.y, headline: bubble.headline });
                }}
                onMouseLeave={() => {
                  onBubbleHover?.(null);
                  setTooltip(null);
                }}
              >
                <line
                  x1={bubble.x}
                  y1={bubble.y}
                  x2={bubble.x}
                  y2={height - padding.bottom}
                  stroke={bubble.color}
                  strokeDasharray="4"
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={isHovered ? 1 : 0.5}
                />
                {/* Larger invisible hit area */}
                <circle cx={bubble.x} cy={bubble.y} r="14" fill="transparent" />
                {/* BPS label */}
                <rect x={bubble.x - 22} y={bubble.y - 32} width="44" height="18" rx="4" fill={bubble.color} opacity="0.15" />
                <rect x={bubble.x - 22} y={bubble.y - 32} width="44" height="18" rx="4" fill="none" stroke={bubble.color} strokeWidth="1" opacity="0.6" />
                <text x={bubble.x} y={bubble.y - 19} textAnchor="middle" fill={bubble.color} fontSize="9" fontWeight="bold">
                  {bubble.bpsLabel}
                </text>
                {/* Glow ring when hovered */}
                {isHovered && (
                  <circle cx={bubble.x} cy={bubble.y} r="10" fill="none" stroke={bubble.color} strokeWidth="2" opacity="0.4" />
                )}
                <circle cx={bubble.x} cy={bubble.y} r={isHovered ? 8 : 6} fill={bubble.color} />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white max-w-[220px] pointer-events-none shadow-xl"
            style={{
              left: `${(tooltip.x / 1000) * 100}%`,
              top: `${(tooltip.y / 300) * 100}%`,
              transform: "translate(-50%, -130%)",
            }}
          >
            {tooltip.headline}
          </div>
        )}
      </div>
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


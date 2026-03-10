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

type TooltipHeadline = { id: string; headline: string; color: string };
type GroupedEvent = {
  key: string;
  x: number;
  y: number;
  color: string;
  yValueLabel: string;
  primaryId: string;
  articleIds: string[];
  headlines: TooltipHeadline[];
};

export default function PriceChart(props: PriceChartProps) {
  const { articles, onBubbleClick, onBubbleHover, hoveredArticleId } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const hideTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedMarket, setSelectedMarket] = useState("US 10Y Yield");
  const [timeRange, setTimeRange] = useState<TimeRange>("1M");
  const [candles, setCandles] = useState<{ t: number[]; c: number[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; primaryId: string; headlines: TooltipHeadline[] } | null>(null);

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    const instrument = MARKET_INSTRUMENTS[selectedMarket];
    if (!instrument) return;

    const now = Math.floor(Date.now() / 1000);
    const days = TIME_WINDOW_DAYS[timeRange] || 180;
    const from = timeRange === "ALL" ? 0 : now - days * 86400;

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

  useEffect(() => {
    return () => {
      if (hideTooltipTimerRef.current) {
        clearTimeout(hideTooltipTimerRef.current);
      }
    };
  }, []);

  const clearHideTooltipTimer = useCallback(() => {
    if (hideTooltipTimerRef.current) {
      clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
  }, []);

  const scheduleTooltipHide = useCallback(() => {
    clearHideTooltipTimer();
    hideTooltipTimerRef.current = setTimeout(() => {
      setTooltip(null);
      onBubbleHover?.(null);
    }, 180);
  }, [clearHideTooltipTimer, onBubbleHover]);

  const timeRanges: TimeRange[] = ["1M", "3M", "6M", "1Y", "2Y", "ALL"];

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

    // Map articles to grouped marker positions.
    // Articles before the chart start are grouped at the left edge.
    // Articles at/after the last candle are grouped at the right edge.
    const minTime = times[0];
    const maxTime = times[times.length - 1];
    const lastIdx = times.length - 1;
    const groupedBySlot = new Map<string, GroupedEvent>();

    for (const a of articles) {
      const at = Math.floor(new Date(a.published_at).getTime() / 1000);

      let fracIdx = lastIdx;
      let slotIdx = lastIdx;
      let slotKey = "right-edge";

      if (at < minTime) {
        fracIdx = 0;
        slotIdx = 0;
        slotKey = "left-edge";
      } else if (at < maxTime) {
        // Find surrounding candle indices and interpolate.
        let lo = 0;
        let hi = lastIdx;
        for (let i = 0; i < times.length; i++) {
          if (times[i] <= at) lo = i;
          if (times[i] >= at && hi === lastIdx) hi = i;
        }

        if (lo === hi || times[lo] === times[hi]) {
          fracIdx = lo;
        } else {
          const t = (at - times[lo]) / (times[hi] - times[lo]);
          fracIdx = lo + t * (hi - lo);
        }

        slotIdx = Math.max(0, Math.min(lastIdx, Math.round(fracIdx)));
        slotKey = `slot-${slotIdx}`;
      }

      const slotX = padding.left + (slotIdx / lastIdx) * chartW;

      // Interpolate price for y-position on the line.
      const loI = Math.floor(fracIdx);
      const hiI = Math.min(loI + 1, lastIdx);
      const frac = fracIdx - loI;
      const interpPrice = prices[loI] + (prices[hiI] - prices[loI]) * frac;
      const baseY = padding.top + chartH - ((interpPrice - minP) / range) * chartH;

      const color =
        a.sentiment === "Bearish" ? "#ff4d6d" : a.sentiment === "Bullish" ? "#00f5d4" : "#fb8500";
      const yValueLabel = interpPrice.toFixed(2);

      const existing = groupedBySlot.get(slotKey);
      if (existing) {
        existing.articleIds.push(a.id);
        existing.headlines.push({ id: a.id, headline: a.headline, color });
      } else {
        groupedBySlot.set(slotKey, {
          key: slotKey,
          x: slotX,
          y: baseY,
          color,
          yValueLabel,
          primaryId: a.id,
          articleIds: [a.id],
          headlines: [{ id: a.id, headline: a.headline, color }],
        });
      }
    }

    const groupedEvents = Array.from(groupedBySlot.values()).sort((a, b) => a.x - b.x);

    const yLabels = Array.from({ length: 5 }, (_, i) => {
      const val = minP + (range * i) / 4;
      const y = padding.top + chartH - (i / 4) * chartH;
      return { val: val.toFixed(2), y };
    });

    const spanDays = (times[times.length - 1] - times[0]) / 86400;
    const xTickCount = 5;
    const dateLabelOptions: Intl.DateTimeFormatOptions =
      spanDays > 730
        ? { month: "short", year: "numeric", timeZone: "UTC" }
        : spanDays > 120
          ? { month: "short", day: "numeric", year: "2-digit", timeZone: "UTC" }
          : { month: "short", day: "numeric", timeZone: "UTC" };
    const xLabels = Array.from({ length: xTickCount }, (_, i) => {
      const idx = Math.round((i / (xTickCount - 1)) * (times.length - 1));
      const x = padding.left + (idx / (prices.length - 1)) * chartW;
      const date = new Date(times[idx] * 1000);
      const label = date.toLocaleDateString("en-US", dateLabelOptions);
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

          {/* News article vertical indicators */}
          <g>
            {groupedEvents.map((event) => {
              const isHovered = hoveredArticleId ? event.articleIds.includes(hoveredArticleId) : false;
              return (
                <line
                  key={`news-line-${event.key}`}
                  x1={event.x}
                  y1={padding.top}
                  x2={event.x}
                  y2={padding.top + chartH}
                  stroke={event.color}
                  strokeDasharray="4 4"
                  strokeWidth={isHovered ? 1.5 : 1}
                  opacity={isHovered ? 0.6 : 0.3}
                />
              );
            })}
          </g>

          {/* Price line */}
          <path
            d={pathD}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="2"
            className="drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]"
          />

          {/* Event bubbles */}
          {groupedEvents.map((event) => {
            const isHovered = hoveredArticleId ? event.articleIds.includes(hoveredArticleId) : false;
            return (
              <g
                key={event.key}
                style={{ cursor: "pointer" }}
                onClick={() => onBubbleClick?.(event.primaryId)}
                onMouseEnter={() => {
                  onBubbleHover?.(event.primaryId);
                  clearHideTooltipTimer();
                  setTooltip({ x: event.x, y: event.y, primaryId: event.primaryId, headlines: event.headlines });
                }}
                onMouseLeave={scheduleTooltipHide}
              >
                <line
                  x1={event.x}
                  y1={event.y}
                  x2={event.x}
                  y2={height - padding.bottom}
                  stroke={event.color}
                  strokeDasharray="4"
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={isHovered ? 1 : 0.5}
                />
                {/* Larger invisible hit area */}
                <circle cx={event.x} cy={event.y} r="14" fill="transparent" />
                {/* Y-axis value label */}
                <rect x={event.x - 22} y={event.y - 32} width="44" height="18" rx="4" fill={event.color} opacity="0.15" />
                <rect x={event.x - 22} y={event.y - 32} width="44" height="18" rx="4" fill="none" stroke={event.color} strokeWidth="1" opacity="0.6" />
                <text x={event.x} y={event.y - 19} textAnchor="middle" fill={event.color} fontSize="9" fontWeight="bold">
                  {event.yValueLabel}
                </text>
                {/* Glow ring when hovered */}
                {isHovered && (
                  <circle cx={event.x} cy={event.y} r="10" fill="none" stroke={event.color} strokeWidth="2" opacity="0.4" />
                )}
                <circle cx={event.x} cy={event.y} r={isHovered ? 8 : 6} fill={event.color} />
              </g>
            );
          })}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-20 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white max-w-[320px] max-h-[180px] overflow-y-auto pointer-events-auto shadow-xl"
            style={{
              left: `${(tooltip.x / 1000) * 100}%`,
              top: `${(tooltip.y / 300) * 100}%`,
              transform: "translate(-50%, -130%)",
            }}
            onMouseEnter={() => {
              clearHideTooltipTimer();
              onBubbleHover?.(tooltip.primaryId);
            }}
            onMouseLeave={scheduleTooltipHide}
          >
            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
              {tooltip.headlines.length} News Item{tooltip.headlines.length === 1 ? "" : "s"}
            </div>
            <div className="space-y-1.5">
              {tooltip.headlines.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  <span
                    className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="leading-snug text-slate-100">{item.headline}</span>
                </div>
              ))}
            </div>
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

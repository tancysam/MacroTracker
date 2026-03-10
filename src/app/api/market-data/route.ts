import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple in-memory cache (per instance) — unchanged from before
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// Auto-detect Finnhub endpoint from symbol prefix:
//   "OANDA:*"   → forex candle endpoint
//   "BINANCE:*" → crypto candle endpoint
//   anything else → stock candle endpoint
function getFinnhubUrl(symbol: string, from: string, to: string, apiKey: string): string {
  const base = "https://finnhub.io/api/v1";
  const params = `symbol=${encodeURIComponent(symbol)}&resolution=D&from=${from}&to=${to}&token=${apiKey}`;

  if (symbol.startsWith("OANDA:"))   return `${base}/forex/candle?${params}`;
  if (symbol.startsWith("BINANCE:")) return `${base}/crypto/candle?${params}`;
  return `${base}/stock/candle?${params}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const symbol = searchParams.get("symbol"); // now a Finnhub symbol e.g. "OANDA:BRENT_USD"
    const from   = searchParams.get("from");   // unix timestamp
    const to     = searchParams.get("to");     // unix timestamp

    if (!symbol || !from || !to) {
      return NextResponse.json(
        { error: "symbol, from, and to are required" },
        { status: 400 }
      );
    }

    // Check in-memory cache first
    const cacheKey = `${symbol}-${from}-${to}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const apiKey = process.env.FINNHUB_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "FINNHUB_API_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const url = getFinnhubUrl(symbol, from, to, apiKey);
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Finnhub returned ${res.status}` },
        { status: 502 }
      );
    }

    const json = await res.json();

    // Finnhub natively returns { s: "ok"|"no_data", t: [...], c: [...], ... }
    // This is the same shape PriceChart.tsx already expects — pass straight through
    if (!json || json.s === "no_data" || !json.t) {
      return NextResponse.json({ s: "no_data", t: [], c: [] });
    }

    const data = { s: "ok", t: json.t as number[], c: json.c as number[] };
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Simple in-memory cache (per instance)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

let crumbCache: { crumb: string; cookie: string; timestamp: number } | null = null;
const CRUMB_TTL = 60 * 60 * 1000; // 1 hour

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  if (crumbCache && Date.now() - crumbCache.timestamp < CRUMB_TTL) {
    return crumbCache;
  }

  const consentRes = await fetch("https://fc.yahoo.com", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html",
    },
  });
  const rawCookies = consentRes.headers.getSetCookie?.() ?? [];
  const cookie = rawCookies.map((c) => c.split(";")[0]).join("; ");

  const crumbRes = await fetch(
    "https://query1.finance.yahoo.com/v1/test/getcrumb",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookie,
      },
    }
  );
  const crumb = await crumbRes.text();

  crumbCache = { crumb, cookie, timestamp: Date.now() };
  return { crumb, cookie };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const symbol = searchParams.get("symbol");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!symbol || !from || !to) {
      return NextResponse.json(
        { error: "symbol, from, and to are required" },
        { status: 400 }
      );
    }

    const cacheKey = `${symbol}-${from}-${to}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const { crumb, cookie } = await getYahooCrumb();

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&period1=${from}&period2=${to}&crumb=${encodeURIComponent(crumb)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Cookie": cookie,
      },
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) crumbCache = null;
      return NextResponse.json({ error: `Yahoo Finance returned ${res.status}` }, { status: 502 });
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) {
      return NextResponse.json({ s: "no_data", t: [], c: [] });
    }

    const t: number[] = result.timestamp || [];
    const c: number[] = result.indicators?.quote?.[0]?.close || [];

    const data = { s: "ok", t, c };
    cache.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

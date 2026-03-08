const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string {
  return process.env.FINNHUB_API_KEY!;
}

export async function fetchGeneralNews(): Promise<FinnhubNewsItem[]> {
  const res = await fetch(
    `${FINNHUB_BASE}/news?category=general&token=${getApiKey()}`,
    { next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`Finnhub news error: ${res.status}`);
  return res.json();
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export async function fetchMarketCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number,
  type: "stock" | "forex" | "crypto" = "stock"
): Promise<FinnhubCandle> {
  let endpoint: string;
  switch (type) {
    case "forex":
      endpoint = `${FINNHUB_BASE}/forex/candle`;
      break;
    case "crypto":
      endpoint = `${FINNHUB_BASE}/crypto/candle`;
      break;
    default:
      endpoint = `${FINNHUB_BASE}/stock/candle`;
  }

  const res = await fetch(
    `${endpoint}?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${to}&token=${getApiKey()}`
  );
  if (!res.ok) throw new Error(`Finnhub candle error: ${res.status}`);
  return res.json();
}

export interface FinnhubCandle {
  c: number[];
  h: number[];
  l: number[];
  o: number[];
  t: number[];
  v: number[];
  s: string;
}

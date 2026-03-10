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


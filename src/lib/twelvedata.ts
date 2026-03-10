const TWELVE_DATA_BASE = "https://api.twelvedata.com";

function getApiKey(): string {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key) throw new Error("TWELVE_DATA_API_KEY is not set");
  return key;
}

/** DB symbol → Twelve Data symbol */
export const TWELVE_DATA_SYMBOLS: Record<string, string> = {
  TLT: "TLT",
  SPY: "SPY",
  EURUSD: "EUR/USD",
  XAU: "XAU/USD",
  BRENT: "BZ",
  DXY: "UUP",
};

/** Finnhub symbol → DB symbol (used by market-data route) */
export const FINNHUB_TO_DB_SYMBOL: Record<string, string> = {
  TLT: "TLT",
  SPY: "SPY",
  "OANDA:EUR_USD": "EURUSD",
  "OANDA:XAU_USD": "XAU",
  "OANDA:BRENT_USD": "BRENT",
  "OANDA:DXY": "DXY",
};

export interface TwelveDataCandle {
  datetime: string; // "YYYY-MM-DD"
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

interface TwelveDataResponse {
  meta?: { symbol: string };
  values?: TwelveDataCandle[];
  status?: string;
  message?: string;
}

export async function fetchDailyCandles(
  twelveDataSymbol: string,
  startDate: string,
  endDate: string
): Promise<TwelveDataCandle[]> {
  const url =
    `${TWELVE_DATA_BASE}/time_series?symbol=${encodeURIComponent(twelveDataSymbol)}` +
    `&interval=1day&start_date=${startDate}&end_date=${endDate}` +
    `&outputsize=5000&apikey=${getApiKey()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Twelve Data returned ${res.status}`);

  const json: TwelveDataResponse = await res.json();

  if (json.status === "error") {
    throw new Error(`Twelve Data error: ${json.message}`);
  }

  return json.values ?? [];
}
